import { test, expect } from "@playwright/test";
import {
  PASSWORD,
  SEED_EXPERT,
  advanceToExpertiseInProgress,
  openSeedDossier,
  reseed,
  signIn,
} from "./helpers";

// Parcours alternatif : refus d'une pièce. Vérifie la garde du motif obligatoire
// puis le passage à l'état "Refusée".
test.describe("Refus d'un dossier", () => {
  test.beforeAll(() => reseed());

  test("le motif est obligatoire puis la pièce passe en « Refusée »", async ({
    page,
  }) => {
    await signIn(page, SEED_EXPERT.email, PASSWORD);
    await openSeedDossier(page);
    await advanceToExpertiseInProgress(page);

    await page.getByRole("button", { name: "Refuser", exact: true }).click();

    // Garde-fou : soumettre sans motif → erreur, pas de confirmation.
    await page.getByRole("button", { name: "Refuser…", exact: true }).click();
    await expect(
      page.getByText("Le motif est obligatoire en cas de refus."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmer définitivement" }),
    ).toHaveCount(0);

    // Avec motif → étape de confirmation → décision finale.
    await page
      .getByLabel("Motif du refus")
      .fill("Surpiqûres non conformes au standard de la maison.");
    await page.getByRole("button", { name: "Refuser…", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirmer définitivement" })
      .click();

    await expect(page.getByText("Refusée")).toBeVisible();
  });
});
