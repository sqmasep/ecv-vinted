import { expect, type Page } from "@playwright/test";

// Seeded buyer (see apps/api/src/seed.ts).
export const SEED_BUYER = {
  email: "alexandre.mercier@ecrin.fr",
  password: "password123",
  name: "Alexandre Mercier",
};

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@ecrin.fr`;
}

// Logs in through the real sign-in form and waits for the authenticated home.
export async function signIn(
  page: Page,
  email = SEED_BUYER.email,
  password = SEED_BUYER.password,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Se déconnecter" }),
  ).toBeVisible();
}

// Registers a brand new account and waits for the authenticated home.
export async function signUp(
  page: Page,
  name: string,
  email: string,
  password = "password123",
): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Se déconnecter" }),
  ).toBeVisible();
}
