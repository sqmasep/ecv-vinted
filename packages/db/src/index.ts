import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

export { schema };

type DB = BunSQLiteDatabase<typeof schema>;

let _db: DB | undefined;

// Lazy so merely importing this module (e.g. from the better-auth CLI running
// under node/jiti) does not eagerly require `bun:sqlite` — neither directly nor
// transitively via drizzle's bun-sqlite driver. The real client is only built
// on first access, at runtime under Bun.
function getDb(): DB {
  if (!_db) {
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    const { Database } = require("bun:sqlite");
    const sqlite = new Database(process.env.DATABASE_URL ?? "local.db");
    _db = drizzle({ client: sqlite, schema });
  }
  return _db as DB;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    return Reflect.get(getDb() as object, prop);
  },
});
