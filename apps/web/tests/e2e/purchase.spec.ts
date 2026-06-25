import { test, expect } from "@playwright/test";
import { signIn, signUp, uniqueEmail } from "./helpers";

test.describe("Purchase tunnel", () => {
  test("a buyer purchases a piece and tracks the order", async ({ page }) => {
    await signIn(page);

    // Browse → open the first available piece.
    await page.goto("/articles");
    await page.locator('a[href^="/articles/"]').first().click();
    await expect(page).toHaveURL(/\/articles\/[0-9a-f-]+/);

    // Add to cart, then follow the morphed link to the cart.
    await page
      .getByRole("button", { name: "Ajouter au panier" })
      .first()
      .click();
    await page.getByRole("link", { name: /Dans le panier/ }).first().click();
    await expect(page).toHaveURL(/\/panier/);
    await expect(
      page.getByRole("heading", { name: "Votre panier" }),
    ).toBeVisible();

    // Checkout.
    await page.getByRole("link", { name: "Procéder au paiement" }).click();
    await expect(page).toHaveURL(/\/paiement/);

    await page.getByLabel("Nom complet").fill("Alexandre Test");
    await page.getByLabel("Adresse", { exact: true }).fill("1 rue de la Paix");
    await page.getByLabel("Code postal").fill("59000");
    await page.getByLabel("Ville").fill("Lille");
    await page.getByLabel("Numéro de carte").fill("4242424242424242");
    await page.getByLabel("Expiration").fill("12/30");
    await page.getByLabel("CVC").fill("123");

    await page.getByRole("button", { name: /Payer et lancer/ }).click();

    // Redirected to the live tracking screen.
    await expect(page).toHaveURL(/\/suivi\/[0-9a-f-]+/);
    await expect(
      page.getByRole("heading", { name: "Suivi de commande" }),
    ).toBeVisible();

    // First milestone active, funds held in escrow.
    await expect(
      page.getByText("Statut de la commande : Achat confirmé"),
    ).toBeAttached();
    await expect(page.getByText("Fonds sous séquestre").first()).toBeVisible();

    // Drive the state machine forward (demo control) → next milestone.
    await page.getByRole("button", { name: "Étape suivante" }).click();
    await expect(
      page.getByText("Statut de la commande : Reçue au hub"),
    ).toBeAttached();
  });

  test("a brand new account can buy end-to-end", async ({ page }) => {
    await signUp(page, "Recrue ÉCRIN", uniqueEmail("buyer"));

    await page.goto("/articles");
    await page.locator('a[href^="/articles/"]').first().click();
    await page
      .getByRole("button", { name: "Ajouter au panier" })
      .first()
      .click();
    await page.getByRole("link", { name: /Dans le panier/ }).first().click();
    await page.getByRole("link", { name: "Procéder au paiement" }).click();

    await page.getByLabel("Nom complet").fill("Recrue ÉCRIN");
    await page.getByLabel("Adresse", { exact: true }).fill("2 avenue Foch");
    await page.getByLabel("Code postal").fill("75116");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByLabel("Numéro de carte").fill("4242424242424242");
    await page.getByLabel("Expiration").fill("12/30");
    await page.getByLabel("CVC").fill("123");
    await page.getByRole("button", { name: /Payer et lancer/ }).click();

    await expect(page).toHaveURL(/\/suivi\/[0-9a-f-]+/);

    // The new order appears in "Mes commandes".
    await page.goto("/commandes");
    await expect(
      page.getByRole("heading", { name: "Mes commandes" }),
    ).toBeVisible();
    await expect(page.locator('a[href^="/suivi/"]').first()).toBeVisible();
  });
});
