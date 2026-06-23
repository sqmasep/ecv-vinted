import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

// Same file the runtime client uses (see src/index.ts) — keep both pinned to
// packages/db/local.db so push/migrate and the API share one database.
const dbPath = fileURLToPath(new URL("./local.db", import.meta.url));

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? dbPath,
  },
});
