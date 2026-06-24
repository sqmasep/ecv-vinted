import { test, expect } from "@playwright/test";

test.describe("Catalogue", () => {
  test("the listing shows authenticated pieces", async ({ page }) => {
    await page.goto("/articles");
    await expect(
      page.getByRole("heading", { name: "Sélection" }),
    ).toBeVisible();
    // At least one product card (links to /articles/:id).
    const cards = page.locator('a[href^="/articles/"]');
    expect(await cards.count()).toBeGreaterThan(0);
    // Reassurance badge from the brand DA.
    await expect(
      page.getByText("Authentification ÉCRIN").first(),
    ).toBeVisible();
  });

  test("filtering by brand narrows the results", async ({ page }) => {
    await page.goto("/articles");
    await page.getByLabel("Marque").selectOption("Rolex");
    await page.getByRole("button", { name: "Filtrer" }).click();

    await expect(page).toHaveURL(/brand=Rolex/);
    // Assert on product titles (brand names also appear in the <select>).
    await expect(page.getByText("Submariner")).toBeVisible();
    await expect(page.getByText("Classic Flap")).toHaveCount(0);
  });

  test("opening a card reaches the product page with a buy CTA", async ({
    page,
  }) => {
    await page.goto("/articles");
    await page.locator('a[href^="/articles/"]').first().click();
    await expect(page).toHaveURL(/\/articles\/[0-9a-f-]+/);
    await expect(
      page.getByRole("button", { name: "Ajouter au panier" }).first(),
    ).toBeVisible();
    // Pedagogy block about authentication.
    await expect(
      page.getByRole("heading", { name: "Comment nous authentifions" }),
    ).toBeVisible();
  });
});
