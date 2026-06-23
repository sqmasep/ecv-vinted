import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { and, asc, eq, gte, like, lte, desc } from "drizzle-orm";
import { auth } from "@repo/auth";
import { db } from "@repo/db";
import { article, order, statusEvent } from "@repo/db/schema";
import {
  advanceOrderSchema,
  articleFiltersSchema,
  createOrderSchema,
  type State,
} from "@repo/schemas";
import {
  NEXT_STATE,
  REJECTABLE_STATES,
  SILENT_STATES,
  TERMINAL_STATES,
} from "./state-machine.js";

const PORT = process.env.PORT || 3001;
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

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

const app = new Elysia()
  .use(
    cors({
      origin: WEB_ORIGIN,
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
      return toOrder(created!);
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
      if (TERMINAL_STATES.includes(cur))
        return status(409, { error: "already_terminal" });

      let next: State | undefined;
      if (body.reject) {
        if (!REJECTABLE_STATES.includes(cur))
          return status(409, { error: "not_rejectable_here" });
        next = "rejected";
      } else {
        next = NEXT_STATE[cur];
      }
      if (!next) return status(409, { error: "no_next_state" });

      await db.insert(statusEvent).values({
        id: crypto.randomUUID(),
        articleId: row.article.id,
        orderId: row.order.id,
        previousState: cur,
        newState: next,
        notificationSent: !SILENT_STATES.includes(next),
      });
      await db
        .update(article)
        .set({ currentState: next })
        .where(eq(article.id, row.article.id));

      // Settle escrow at the terminal states.
      if (next === "delivered")
        await db
          .update(order)
          .set({ status: "released" })
          .where(eq(order.id, row.order.id));
      if (next === "rejected")
        await db
          .update(order)
          .set({ status: "refunded" })
          .where(eq(order.id, row.order.id));

      const [updated] = await db
        .select()
        .from(order)
        .innerJoin(article, eq(order.articleId, article.id))
        .where(eq(order.id, params.id));
      return { ...toOrder(updated!.order), article: toArticle(updated!.article) };
    },
    { body: advanceOrderSchema },
  )
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
