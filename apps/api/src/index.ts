import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "@repo/auth";
import { and, asc, db, desc, eq, gte, like, lte } from "@repo/db";
import { article, order, statusEvent } from "@repo/db/schema";
import {
  advanceOrderSchema,
  articleFiltersSchema,
  createOrderSchema,
  type State,
} from "@repo/schemas";
import {
  transition,
  FORWARD_EVENT,
  effectsNotify,
  type ExpertiseEvent,
  type TransitionPayload,
} from "./domain/expertise/state-machine.js";
import { ExpertiseService } from "./domain/expertise/expertise-service.js";
import { ConsoleNotifier } from "./domain/expertise/notifier.js";
import {
  createExpertiseRoutes,
  type AuthUser,
} from "./domain/expertise/routes.js";

const PORT = process.env.PORT || 3001;
// Browser origins allowed to call the API with credentials (cookie auth).
// Front-acheteur (3000) + back-office (3002); override via CORS_ORIGINS.
const WEB_ORIGINS = (
  process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3002"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// --- mappers: Drizzle rows -> JSON-friendly contract (epoch ms, see schemas) -

type ArticleRow = typeof article.$inferSelect;
type OrderRow = typeof order.$inferSelect;
type StatusEventRow = typeof statusEvent.$inferSelect;

const toArticle = (r: ArticleRow) => ({
  id: r.id,
  sellerId: r.sellerId,
  title: r.title,
  brand: r.brand,
  price: r.price,
  authenticationFee: r.authenticationFee,
  currentState: r.currentState,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

const toOrder = (r: OrderRow) => ({
  id: r.id,
  articleId: r.articleId,
  buyerId: r.buyerId,
  status: r.status,
  amount: r.amount,
  date: r.date.getTime(),
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

const toStatusEvent = (r: StatusEventRow) => ({
  id: r.id,
  articleId: r.articleId,
  orderId: r.orderId,
  previousState: r.previousState,
  newState: r.newState,
  occurredAt: r.occurredAt.getTime(),
  notificationSent: r.notificationSent,
});

// Resolve the authenticated user from the request cookies, or null.
async function currentUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

// Back brick (expertise) wiring: real service (db + console notifier) and a
// session reader narrowed to { id, role } for the route guards.
const expertiseService = new ExpertiseService(db, new ConsoleNotifier());

async function expertiseUser(request: Request): Promise<AuthUser | null> {
  const user = await currentUser(request);
  // role is an optional better-auth additionalField; default to the safest role.
  return user ? { id: user.id, role: user.role ?? "buyer" } : null;
}

const expertiseRoutes = createExpertiseRoutes({
  service: expertiseService,
  getUser: expertiseUser,
  db,
});

const app = new Elysia()
  .use(
    cors({
      origin: WEB_ORIGINS,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  // better-auth handles everything under /api/auth/*
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .get("/", () => "Hello Elysia")

  // --- Catalogue (public reads) -------------------------------------------
  .get(
    "/articles",
    async ({ query }) => {
      const conditions = [
        // Listing shows only purchasable pieces unless a state filter is given.
        eq(article.currentState, query.state ?? "listed"),
      ];
      if (query.brand) conditions.push(eq(article.brand, query.brand));
      if (query.minPrice !== undefined)
        conditions.push(gte(article.price, query.minPrice));
      if (query.maxPrice !== undefined)
        conditions.push(lte(article.price, query.maxPrice));
      if (query.q) conditions.push(like(article.title, `%${query.q}%`));

      const rows = await db
        .select()
        .from(article)
        .where(and(...conditions))
        .orderBy(desc(article.createdAt));
      return rows.map(toArticle);
    },
    { query: articleFiltersSchema },
  )
  .get("/articles/:id", async ({ params, status }) => {
    const [row] = await db
      .select()
      .from(article)
      .where(eq(article.id, params.id));
    if (!row) return status(404, { error: "article_not_found" });
    return toArticle(row);
  })

  // --- Orders (buyer, protected) ------------------------------------------
  .post(
    "/orders",
    async ({ body, request, status }) => {
      const user = await currentUser(request);
      if (!user) return status(401, { error: "unauthorized" });

      const [art] = await db
        .select()
        .from(article)
        .where(eq(article.id, body.articleId));
      if (!art) return status(404, { error: "article_not_found" });
      if (art.currentState !== "listed")
        return status(409, { error: "article_unavailable" });

      const orderId = crypto.randomUUID();
      const amount = art.price + art.authenticationFee;

      // Mocked escrow: paymentToken is accepted but never stored. Funds "held".
      await db.insert(order).values({
        id: orderId,
        articleId: art.id,
        buyerId: user.id,
        status: "held",
        amount,
        date: new Date(),
      });
      await db
        .update(article)
        .set({ currentState: "sold_awaiting_shipment" })
        .where(eq(article.id, art.id));
      await db.insert(statusEvent).values({
        id: crypto.randomUUID(),
        articleId: art.id,
        orderId,
        previousState: "listed",
        newState: "sold_awaiting_shipment",
        notificationSent: true,
      });

      const [created] = await db
        .select()
        .from(order)
        .where(eq(order.id, orderId));
      if (!created) return status(500, { error: "order_creation_failed" });
      return toOrder(created);
    },
    { body: createOrderSchema },
  )
  .get("/orders", async ({ request, status }) => {
    const user = await currentUser(request);
    if (!user) return status(401, { error: "unauthorized" });

    const rows = await db
      .select()
      .from(order)
      .innerJoin(article, eq(order.articleId, article.id))
      .where(eq(order.buyerId, user.id))
      .orderBy(desc(order.date));
    return rows.map((r) => ({ ...toOrder(r.order), article: toArticle(r.article) }));
  })
  .get("/orders/:id", async ({ params, request, status }) => {
    const user = await currentUser(request);
    if (!user) return status(401, { error: "unauthorized" });

    const [row] = await db
      .select()
      .from(order)
      .innerJoin(article, eq(order.articleId, article.id))
      .where(eq(order.id, params.id));
    if (!row) return status(404, { error: "order_not_found" });
    if (row.order.buyerId !== user.id)
      return status(403, { error: "forbidden" });
    return { ...toOrder(row.order), article: toArticle(row.article) };
  })
  .get("/orders/:id/events", async ({ params, request, status }) => {
    const user = await currentUser(request);
    if (!user) return status(401, { error: "unauthorized" });

    const [own] = await db
      .select({ buyerId: order.buyerId })
      .from(order)
      .where(eq(order.id, params.id));
    if (!own) return status(404, { error: "order_not_found" });
    if (own.buyerId !== user.id) return status(403, { error: "forbidden" });

    const rows = await db
      .select()
      .from(statusEvent)
      .where(eq(statusEvent.orderId, params.id))
      .orderBy(asc(statusEvent.occurredAt));
    return rows.map(toStatusEvent);
  })

  // --- Dev-only: advance the state machine to demo the timeline -----------
  .post(
    "/orders/:id/advance",
    async ({ params, body, request, status }) => {
      const user = await currentUser(request);
      if (!user) return status(401, { error: "unauthorized" });

      const [row] = await db
        .select()
        .from(order)
        .innerJoin(article, eq(order.articleId, article.id))
        .where(eq(order.id, params.id));
      if (!row) return status(404, { error: "order_not_found" });
      if (row.order.buyerId !== user.id)
        return status(403, { error: "forbidden" });

      const cur = row.article.currentState as State;

      // Route the demo walk through the SAME state machine the back brick uses
      // (no status written outside transition()). Synthetic payloads stand in
      // for the operator inputs this dev endpoint does not collect.
      let event: ExpertiseEvent;
      let payload: TransitionPayload = {};
      if (body.reject) {
        event = "REFUSER";
        payload = { motif: "Refus (démo)" };
      } else {
        const forward = FORWARD_EVENT[cur];
        if (!forward) return status(409, { error: "no_next_state" });
        event = forward;
        payload = { hubId: "hub-demo", expertId: user.id };
      }

      const result = transition(cur, event, payload);
      if (!result.ok) return status(409, { error: "transition_forbidden" });
      const next = result.etatCible;

      await db.insert(statusEvent).values({
        id: crypto.randomUUID(),
        articleId: row.article.id,
        orderId: row.order.id,
        previousState: cur,
        newState: next,
        actorId: user.id,
        source: "operateur",
        notificationSent: effectsNotify(result.effets),
      });
      await db
        .update(article)
        .set({ currentState: next })
        .where(eq(article.id, row.article.id));

      // Settle escrow from the machine's effects (release on delivery, refund
      // on refusal) — never inferred from the state name directly.
      if (result.effets.some((e) => e.type === "RELEASE_ESCROW"))
        await db
          .update(order)
          .set({ status: "released" })
          .where(eq(order.id, row.order.id));
      if (result.effets.some((e) => e.type === "REFUND"))
        await db
          .update(order)
          .set({ status: "refunded" })
          .where(eq(order.id, row.order.id));

      const [updated] = await db
        .select()
        .from(order)
        .innerJoin(article, eq(order.articleId, article.id))
        .where(eq(order.id, params.id));
      if (!updated) return status(500, { error: "order_update_failed" });
      return {
        ...toOrder(updated.order),
        article: toArticle(updated.article),
      };
    },
    { body: advanceOrderSchema },
  )

  // --- Back brick: expertise / authentication routes ----------------------
  .use(expertiseRoutes)
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
