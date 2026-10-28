import type { Page } from "@playwright/test";
import path from "path";

export async function fillStripeCheckoutAndPay(
  page: Page,
  cardNumber: string,
  options?: { expectDecline?: boolean },
) {
  await page.locator('input[name="cardNumber"]').fill(cardNumber);
  await page.locator('input[name="cardExpiry"]').fill("12/34");
  await page.locator('input[name="cardCvc"]').fill("123");
  await page.locator('input[name="billingName"]').fill("Sam Test");
  const country = page.locator('select[name="billingCountryCode"], select[name="billingCountry"]').first();
  if (await country.count()) await country.selectOption("GB");
  const postcode = page.locator('input[name="billingPostalCode"], input[name="postalCode"]').first();
  if (await postcode.count()) await postcode.fill("SW1A 1AA");
  const linkSave = page.getByRole("checkbox", { name: /save my info|link/i });
  if (await linkSave.isVisible().catch(() => false)) {
    await linkSave.uncheck().catch(() => undefined);
  }
  await page.getByTestId("hosted-payment-submit-button").click();
  if (options?.expectDecline) {
    await page.getByText(/declined|failed|could not|card was declined/i).waitFor({ timeout: 60_000 });
  }
}

export const adminPassword = process.env.ADMIN_PASSWORD || "portrait-dev";

export async function completePortraitWizard(page: Page, email: string, store?: string) {
  const suffix = store ? `?store=${store}` : "";
  const catalogReady = page.waitForResponse(
    (response) => response.url().includes("/api/catalog") && response.ok(),
  );
  await page.goto(`/create${suffix}`);
  await catalogReady;
  await page.getByRole("button", { name: "Continue" }).first().click();
  const sample = path.join(process.cwd(), "public/examples/pet-before.jpg");
  await page.getByTestId("photo-upload").setInputFiles(sample);
  await page.getByRole("button", { name: "Continue" }).click();
  const styleButtons = page.locator("button.rounded-2xl.border.p-3");
  await styleButtons.first().waitFor({ state: "visible", timeout: 30_000 });
  await styleButtons.nth(0).click({ noWaitAfter: true });
  await styleButtons.nth(1).click({ noWaitAfter: true });
  await styleButtons.nth(2).click({ noWaitAfter: true });
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
