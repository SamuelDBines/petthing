import type { Page } from "@playwright/test";
import path from "path";

export const adminPassword = process.env.ADMIN_PASSWORD || "portrait-dev";

export async function completePortraitWizard(page: Page, email: string) {
  await page.goto("/create");
  await page.getByRole("button", { name: "Continue" }).first().click();
  const sample = path.join(process.cwd(), "public/examples/pet-before.jpg");
  await page.getByTestId("photo-upload").setInputFiles(sample);
  await page.getByRole("button", { name: "Continue" }).click();
  const styleButtons = page.locator('button[type="button"]').filter({ hasText: /portrait|dusk|storybook|vampire|witch|skeleton/i });
  await styleButtons.nth(0).click();
  await styleButtons.nth(1).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("checkout-email").fill(email);
  await page.getByRole("checkbox", { name: /permission/i }).check();
  await page.getByRole("checkbox", { name: /immediate supply/i }).check();
  await page.getByTestId("pay-button").click();
}

export async function runGenerationOnSuccess(page: Page) {
  await page.waitForURL(/\/checkout\/success/);
  await page.getByRole("button", { name: /Paint the portraits/i }).click();
  await page.waitForTimeout(2000);
}

export async function adminLogin(page: Page) {
  await page.goto("/admin");
  await page.getByTestId("admin-password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('[data-testid="admin-dashboard"]');
}

export async function approveLatestReview(page: Page) {
  const approve = page.getByTestId("approve-order").first();
  if (await approve.isVisible().catch(() => false)) {
    await approve.click();
    await page.waitForTimeout(1000);
  }
}

export function stripeE2EEnabled() {
  return process.env.E2E_STRIPE_READY === "1" || process.env.E2E_STRIPE === "1";
}
