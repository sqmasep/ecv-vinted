import { execSync } from "node:child_process";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

// Comptes seedés (cf. apps/api/src/seed.ts). Mot de passe commun.
export const PASSWORD = "password123";
export const SEED_EXPERT = { email: "lucas.phillipe@ecrin.fr", name: "Lucas Phillipe" };
export const SEED_ADMIN = { email: "sacha.debusschere@ecrin.fr", name: "Sacha Debusschère" };
export const SEED_BUYER = { email: "alexandre.mercier@ecrin.fr", name: "Alexandre Mercier" };

// Pièce seedée à l'état "vendue" (sold_awaiting_shipment) — point d'entrée du
// parcours d'expertise (réception au hub). Cf. DEMO dans apps/api/src/seed.ts.
export const SEED_DOSSIER = { brand: "Gucci", title: "Sac Diana medium cuir grainé" };

// Réensemence la base via le script du package API. Synchrone : les serveurs
// tournent déjà (SQLite sur fichier), la nouvelle donnée est lue à la requête
// suivante. Appelé en globalSetup et en beforeAll des specs qui mutent l'état.
export function reseed(): void {
  const apiDir = path.resolve(process.cwd(), "../api");
  execSync("bun run src/seed.ts", { cwd: apiDir, stdio: "inherit" });
}

// Connexion via le vrai formulaire opérateur. Ne présume pas de la destination
// (un acheteur arrive sur l'écran "Accès refusé", un expert sur les dossiers) :
// attend simplement que l'on quitte /sign-in. L'appelant asserte la suite.
export async function signIn(
  page: Page,
  email: string,
  password = PASSWORD,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/$/);
}

// Ouvre le dossier de la pièce seedée depuis la liste et attend la fiche.
export async function openSeedDossier(page: Page): Promise<void> {
  await page.getByRole("link", { name: new RegExp(SEED_DOSSIER.brand) }).click();
  await expect(
    page.getByRole("heading", { name: SEED_DOSSIER.title }),
  ).toBeVisible();
}

// Réception au hub → démarrage de l'expertise → état authentication_in_progress.
// Brique commune aux parcours de validation et de refus.
export async function advanceToExpertiseInProgress(page: Page): Promise<void> {
  // Réception au hub.
  await page
    .getByRole("button", { name: "Enregistrer la réception au hub" })
    .click();
  await page.getByLabel("Identifiant du hub").fill("hub-paris-01");
  await page.getByRole("button", { name: "Confirmer la réception" }).click();
  await expect(page.getByText("Reçue au hub")).toBeVisible();

  // Démarrage de l'expertise (assignation d'un expert).
  await page.getByRole("button", { name: "Démarrer l'expertise" }).click();
  await page.getByLabel("Expert à assigner").selectOption({ label: SEED_EXPERT.name });
  // Le formulaire porte le même libellé que le bouton d'ouverture → le submit
  // est le dernier des deux.
  await page
    .getByRole("button", { name: "Démarrer l'expertise" })
    .last()
    .click();
  await expect(page.getByText("Expertise en cours")).toBeVisible();
}
