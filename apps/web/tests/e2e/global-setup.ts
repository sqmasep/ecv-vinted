import { execSync } from "node:child_process";
import path from "node:path";

// Reseed the database before the suite so listed inventory and demo orders are
// in a known state. Runs the API package's bun:sqlite seed script.
export default function globalSetup() {
  const apiDir = path.resolve(process.cwd(), "../api");
  console.log("[e2e] seeding database…");
  execSync("bun run src/seed.ts", { cwd: apiDir, stdio: "inherit" });
}
