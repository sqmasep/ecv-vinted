import { fileURLToPath } from "node:url";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

export { schema };

// Re-export query helpers so consumers share the same drizzle-orm instance as
// the schema columns — avoids duplicate-package type errors in the monorepo.
export { and, asc, desc, eq, gte, inArray, isNull, like, lte, or } from "drizzle-orm";

type DB = BunSQLiteDatabase<typeof schema>;

// Resolve the db file relative to THIS package (packages/db), not the cwd of
// whatever process imports it. The API runs with cwd=apps/api, drizzle-kit with
// cwd=packages/db; a relative "local.db" therefore opens two different files —
// push fills one, the API reads an empty one with no `user` table.
const defaultDbPath = fileURLToPath(new URL("../local.db", import.meta.url));

let _db: DB | undefined;

// Lazy so merely importing this module (e.g. from the better-auth CLI running
// under node/jiti) does not eagerly require `bun:sqlite` — neither directly nor
// transitively via drizzle's bun-sqlite driver. The real client is only built
// on first access, at runtime under Bun.
function getDb(): DB {
  if (!_db) {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    const { Database } = require("bun:sqlite");
    const sqlite = new Database(process.env.DATABASE_URL ?? defaultDbPath);
    // Wait instead of erroring if another process (e.g. the API during an e2e
    // seed) briefly holds the write lock.
    sqlite.exec("PRAGMA busy_timeout = 5000;");
    _db = drizzle({ client: sqlite, schema });
  }
  return _db as DB;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb() as object, prop);
  },
});
