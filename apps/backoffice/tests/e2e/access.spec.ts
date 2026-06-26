import { test, expect } from "@playwright/test";
import { PASSWORD, SEED_BUYER, SEED_EXPERT, signIn } from "./helpers";

// Contrôle d'accès au shell back-office (équivalent du auth.spec côté web).
// L'API reste la garde finale (403) ; ici on vérifie la garde d'UI.
test.describe("Contrôle d'accès", () => {
  test("un invité est redirigé vers la connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("Connexion opérateur")).toBeVisible();
  });

  test("des identifiants invalides laissent sur la page de connexion", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Adresse e-mail").fill(SEED_EXPERT.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("un acheteur authentifié sans rôle voit l'accès refusé", async ({
    page,
  }) => {
    await signIn(page, SEED_BUYER.email, PASSWORD);
    await expect(page.getByText("Accès refusé")).toBeVisible();
    await expect(page.getByText(SEED_BUYER.email)).toBeVisible();
    // Aucune liste de dossiers exposée.
    await expect(
      page.getByRole("heading", { name: "Dossiers d'expertise" }),
    ).toHaveCount(0);
  });

  test("un expert accède aux dossiers d'expertise", async ({ page }) => {
    await signIn(page, SEED_EXPERT.email, PASSWORD);
    await expect(
      page.getByRole("heading", { name: "Dossiers d'expertise" }),
    ).toBeVisible();
  });
});
