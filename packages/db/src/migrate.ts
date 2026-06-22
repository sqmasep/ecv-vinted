import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./index.js";

// Applies SQL files from ./drizzle (created by `drizzle-kit generate`)
// using the bun:sqlite runtime — no extra driver needed by drizzle-kit.
migrate(db, { migrationsFolder: "./drizzle" });
console.log("✅ migrations applied");
