import { eq } from "drizzle-orm";
import type { Role, State } from "@repo/schemas";
import { auth } from "@repo/auth";
import { db } from "@repo/db";
import { user, article, order, statusEvent } from "@repo/db/schema";

// Demo data for the ÉCRIN buyer tunnel. Run with `bun db:seed` (apps/api) or
// `turbo run db:seed` from the repo root.

const PASSWORD = "password123";

async function ensureUser(email: string, name: string, role: Role) {
  try {
    await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  } catch {
    // already exists — fine
  }
  await db.update(user).set({ role }).where(eq(user.email, email));
  const [row] = await db.select().from(user).where(eq(user.email, email));
  if (!row) throw new Error(`failed to create user ${email}`);
  return row.id;
}

type ArticleSpec = {
  title: string;
  brand: string;
  price: number; // cents
  fee: number; // cents
};

const LISTED: ArticleSpec[] = [
  { title: "Sac Kelly 28 cuir Togo noir", brand: "Hermès", price: 1450000, fee: 12000 },
  { title: "Sac Classic Flap medium caviar", brand: "Chanel", price: 720000, fee: 9000 },
  { title: "Montre Submariner Date acier", brand: "Rolex", price: 1190000, fee: 15000 },
  { title: "Sac Speedy 25 Monogram", brand: "Louis Vuitton", price: 145000, fee: 6000 },
  { title: "Sac Lady Dior medium cannage", brand: "Dior", price: 480000, fee: 8000 },
];

// Pieces dedicated to demo orders, each frozen at a different milestone.
const DEMO: { spec: ArticleSpec; target: State; rejected?: boolean }[] = [
  {
    spec: { title: "Sac Diana medium cuir grainé", brand: "Gucci", price: 320000, fee: 7000 },
    target: "sold_awaiting_shipment",
  },
  {
    spec: { title: "Montre Tank Louis Cartier or", brand: "Cartier", price: 980000, fee: 12000 },
    target: "delivered",
  },
  {
    spec: { title: "Sac Birkin 30 supposé Togo", brand: "Hermès", price: 1600000, fee: 15000 },
    target: "authentication_in_progress",
    rejected: true,
  },
];

// Happy-path order of states (lab_analysis is the sub-state milestone).
const PATH: State[] = [
  "sold_awaiting_shipment",
  "received_at_hub",
  "authentication_in_progress",
  "lab_analysis",
  "authenticated",
  "shipped",
  "delivered",
];

async function createArticle(spec: ArticleSpec, sellerId: string, state: State) {
  const id = crypto.randomUUID();
  await db.insert(article).values({
    id,
    sellerId,
    title: spec.title,
    brand: spec.brand,
    price: spec.price,
    authenticationFee: spec.fee,
    currentState: state,
  });
  return id;
}

async function createOrderWithTimeline(
  articleId: string,
  spec: ArticleSpec,
  buyerId: string,
  target: State,
  rejected: boolean,
) {
  const orderId = crypto.randomUUID();
  const amount = spec.price + spec.fee;
  let t = Date.now() - 1000 * 60 * 60 * 30; // start 30h ago

  await db.insert(order).values({
    id: orderId,
    articleId,
    buyerId,
    status: "held",
    amount,
    date: new Date(t),
  });

  const sequence: State[] = rejected
    ? ["sold_awaiting_shipment", "received_at_hub", "authentication_in_progress", "rejected"]
    : PATH.slice(0, PATH.indexOf(target) + 1);

  let prev: State = "listed";
  for (const s of sequence) {
    await db.insert(statusEvent).values({
      id: crypto.randomUUID(),
      articleId,
      orderId,
      previousState: prev,
      newState: s,
      occurredAt: new Date(t),
      notificationSent: s !== "lab_analysis",
    });
    prev = s;
    t += 1000 * 60 * 60 * 3; // +3h between jalons
  }

  const finalState = prev;
  await db.update(article).set({ currentState: finalState }).where(eq(article.id, articleId));
  const escrow =
    finalState === "delivered" ? "released" : finalState === "rejected" ? "refunded" : "held";
  await db.update(order).set({ status: escrow }).where(eq(order.id, orderId));
}

async function main() {
  const sellerId = await ensureUser("vendeur@ecrin.test", "Vendeur ÉCRIN", "seller");
  const buyerId = await ensureUser("alexandre@ecrin.test", "Alexandre", "buyer");
  await ensureUser("expert@ecrin.test", "Expert ÉCRIN", "expert");

  // Clear domain data (respect FK order) for a repeatable seed.
  await db.delete(statusEvent);
  await db.delete(order);
  await db.delete(article);

  for (const spec of LISTED) {
    await createArticle(spec, sellerId, "listed");
  }

  for (const { spec, target, rejected } of DEMO) {
    const articleId = await createArticle(spec, sellerId, "listed");
    await createOrderWithTimeline(articleId, spec, buyerId, target, Boolean(rejected));
  }

  console.log("✅ seed done");
  console.log("   buyer login:  alexandre@ecrin.test /", PASSWORD);
  console.log("   seller login: vendeur@ecrin.test /", PASSWORD);
}

main().then(() => process.exit(0));
