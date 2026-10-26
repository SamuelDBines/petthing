import { test, expect } from "@playwright/test";
import path from "path";
import {
  adminLogin,
  approveLatestReview,
  completePortraitWizard,
  runGenerationOnSuccess,
  stripeE2EEnabled,
} from "./helpers";

const screenshotDir = path.join(process.cwd(), "artifacts/screenshots");

test.describe("Pawtraitry store @mock", () => {
  test.setTimeout(120_000);

  test("demo checkout → generate → admin shows sale", async ({ page }) => {
    const email = `e2e-${Date.now()}@pawtraitry.test`;
    await completePortraitWizard(page, email);
    await page.waitForURL(/\/checkout\/success/);
    await page.screenshot({ path: path.join(screenshotDir, "checkout-success.png"), fullPage: true });
    await runGenerationOnSuccess(page);
    await adminLogin(page);
    await approveLatestReview(page);
    await expect(page.getByTestId("admin-orders-table")).toContainText(email);
    await expect(page.getByTestId("admin-orders-table")).toContainText(/Delivered|In review|Generating|Paid/i);
    await page.getByTestId("admin-sales-tab").click();
    await expect(page.getByTestId("admin-sales-panel")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "admin-sales.png"), fullPage: true });
    await page.getByTestId("admin-sales-tab").click();
    await page.locator('[data-testid="admin-dashboard"] button', { hasText: "Orders" }).click();
    await page.screenshot({ path: path.join(screenshotDir, "admin-orders.png"), fullPage: true });
  });

  test("screenshots @screenshots", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: path.join(screenshotDir, "storefront.png"), fullPage: true });
    await page.goto("/create");
    await page.screenshot({ path: path.join(screenshotDir, "create-flow.png"), fullPage: true });
    await adminLogin(page);
    await page.getByTestId("admin-content-tab").click();
    await page.screenshot({ path: path.join(screenshotDir, "admin-content-queue.png"), fullPage: true });
  });
});

test.describe("Stripe Checkout @stripe", () => {
  test.skip(!stripeE2EEnabled(), "Set E2E_STRIPE=1 and sk_test_ STRIPE_SECRET_KEY in .env.local");

  test("successful card completes payment webhook flow", async ({ page }) => {
    const email = `stripe-${Date.now()}@pawtraitry.test`;
    await completePortraitWizard(page, email);
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    await page.screenshot({ path: path.join(screenshotDir, "stripe-checkout.png"), fullPage: true });
    await page.locator('input[name="cardNumber"]').fill("4242424242424242");
    await page.locator('input[name="cardExpiry"]').fill("12/34");
    await page.locator('input[name="cardCvc"]').fill("123");
    await page.locator('input[name="billingName"]').fill("Sam Test");
    await page.getByRole("button", { name: /Pay/i }).click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 });
    await page.screenshot({ path: path.join(screenshotDir, "checkout-success.png"), fullPage: true });
    await runGenerationOnSuccess(page);
    await adminLogin(page);
    await approveLatestReview(page);
    await expect(page.getByTestId("admin-orders-table")).toContainText(email);
  });

  test("declined card shows failure", async ({ page }) => {
    const email = `decline-${Date.now()}@pawtraitry.test`;
    await completePortraitWizard(page, email);
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    await page.locator('input[name="cardNumber"]').fill("4000000000000002");
    await page.locator('input[name="cardExpiry"]').fill("12/34");
    await page.locator('input[name="cardCvc"]').fill("123");
    await page.locator('input[name="billingName"]').fill("Sam Test");
    await page.getByRole("button", { name: /Pay/i }).click();
    await expect(page.getByText(/declined|failed|could not/i)).toBeVisible({ timeout: 60_000 });
  });
});
