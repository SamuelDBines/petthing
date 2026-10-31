import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function shopCheckoutToStripeOrSuccess(
  page: import("@playwright/test").Page,
  store: "fixmonger" | "jinglefold",
) {
  await page.goto(`/?store=${store}`);
  await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect
    .poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem("ps_shop_cart"));
      return raw ? (JSON.parse(raw) as { length: number }).length : 0;
    })
    .toBeGreaterThan(0);
  const cart = await page.goto(`/shop/cart?store=${store}`);
  expect(cart?.status()).toBe(200);
  await expect(page.getByTestId("fixmonger-cart")).toBeVisible();
  await expect(page.getByText(/^Qty /)).toBeVisible();
  const email = `prod-${store}-${Date.now()}@example.com`;
  await page.getByTestId("fixmonger-checkout-email").fill(email);
  const checkoutDone = page.waitForResponse(
    (r) => r.url().includes("/api/shop/checkout") && r.request().method() === "POST",
  );
  await page.getByTestId("fixmonger-checkout").click();
  const response = await checkoutDone;
  expect(response.ok()).toBeTruthy();
  await page.waitForURL(/checkout\.stripe\.com|\/shop\/success/, { timeout: 90_000 });
}

test.describe("production shop checkout paths", () => {
  test("Fixmonger cart loads and checkout starts", async ({ page }) => {
    await shopCheckoutToStripeOrSuccess(page, "fixmonger");
  });

  test("Jinglefold cart loads and checkout starts", async ({ page }) => {
    await shopCheckoutToStripeOrSuccess(page, "jinglefold");
  });
});
