import { reseed } from "./helpers";

// Réamorce la base avant la suite : inventaire et dossiers d'expertise dans un
// état connu. Réutilise le script de seed du package API (bun:sqlite).
export default function globalSetup() {
  console.log("[e2e] seeding database…");
  reseed();
}
