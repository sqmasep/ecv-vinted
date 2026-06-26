import { test, expect } from "@playwright/test";
import {
  PASSWORD,
  SEED_EXPERT,
  advanceToExpertiseInProgress,
  openSeedDossier,
  reseed,
  signIn,
} from "./helpers";

// Parcours d'expertise complet et heureux : réception → démarrage → rapport →
// validation, avec vérification du badge d'état à chaque jalon.
test.describe("Parcours d'expertise complet", () => {
  // Le parcours mute l'état de la pièce seedée → base remise à neuf avant.
  test.beforeAll(() => reseed());

  test("réception → expertise → rapport → authentification", async ({
    page,
  }) => {
    await signIn(page, SEED_EXPERT.email, PASSWORD);
    await openSeedDossier(page);

    await advanceToExpertiseInProgress(page);

    // Saisie d'un rapport labo conforme.
    await page.getByRole("button", { name: "Saisir un rapport" }).click();
    await page.getByLabel("Laboratoire").fill("Labo Paris");
    await page.getByLabel("Résultat").selectOption({ label: "Conforme" });
    await page
      .getByLabel("URL du document")
      .fill("https://labo.test/rapport.pdf");
    await page.getByRole("button", { name: "Enregistrer le rapport" }).click();
    // Le rapport persiste et réapparaît après refresh.
    await expect(page.getByText("Labo Paris")).toBeVisible();

    // Décision : validation de l'authentification (étape de confirmation).
    await page.getByRole("button", { name: "Valider", exact: true }).click();
    await page.getByRole("button", { name: "Valider…", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirmer définitivement" })
      .click();

    // État final : badge "Authentifiée" (teal Vinted) et plus d'actions.
    await expect(page.getByText("Authentifiée")).toBeVisible();
    await expect(
      page.getByText("Aucune action disponible", { exact: false }),
    ).toBeVisible();
  });
});
