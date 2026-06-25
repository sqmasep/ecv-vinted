// In-memory test database for integration tests.
//
// Runs under the Bun test runner (`bun test`) using the built-in bun:sqlite —
// the SAME driver as production, so transaction semantics are identical and
// there is no native module to compile (this repo lives on a OneDrive path
// where node-native modules fail to install). The real migrations are applied
// so the test schema can never drift from production.

import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "@repo/db/schema";
import type { AppDb } from "../domain/expertise/expertise-service.js";

const migrationsFolder = fileURLToPath(
  new URL("../../../../packages/db/drizzle", import.meta.url),
);

export function makeTestDb(): AppDb {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder });
  return db;
}

// Minimal fixtures: a seller, a buyer, an expert, plus one sold article and its
// order (escrow held) — the starting point of the back brick.
export function seedFixtures(db: AppDb) {
  const sellerId = "u_seller";
  const buyerId = "u_buyer";
  const expertId = "u_expert";
  const articleId = "art_1";
  const orderId = "ord_1";

  db.insert(schema.user)
    .values([
      { id: sellerId, name: "Seller", email: "seller@test", role: "seller" },
      { id: buyerId, name: "Buyer", email: "buyer@test", role: "buyer" },
      { id: expertId, name: "Expert", email: "expert@test", role: "expert" },
    ])
    .run();

  db.insert(schema.article)
    .values({
      id: articleId,
      sellerId,
      title: "Sac test",
      brand: "Hermès",
      price: 1_000_000,
      authenticationFee: 10_000,
      currentState: "sold_awaiting_shipment",
    })
    .run();

  db.insert(schema.order)
    .values({
      id: orderId,
      articleId,
      buyerId,
      status: "held",
      amount: 1_010_000,
      date: new Date(),
    })
    .run();

  return { sellerId, buyerId, expertId, articleId, orderId };
}
