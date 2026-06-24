import { test, expect } from "@playwright/test";
import { SEED_BUYER, signIn, signUp, uniqueEmail } from "./helpers";

test.describe("Authentication", () => {
  test("a visitor can create a new account", async ({ page }) => {
    await signUp(page, "Nouvel Acheteur", uniqueEmail("signup"));
    // Authenticated home shows the hero CTA into the shop.
    await expect(
      page.getByRole("link", { name: /Découvrir la boutique/ }),
    ).toBeVisible();
  });

  test("a seeded buyer can sign in", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(new RegExp(SEED_BUYER.name))).toBeVisible();
  });

  test("invalid credentials keep the user on the sign-in page", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(SEED_BUYER.email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // No redirect to home; an error toast is shown.
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByRole("button", { name: "Se déconnecter" }),
    ).toHaveCount(0);
  });

  test("a guest is redirected from a protected page to sign-in", async ({
    page,
  }) => {
    await page.goto("/commandes");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
