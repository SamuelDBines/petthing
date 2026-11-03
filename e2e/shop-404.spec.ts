import { test, expect } from "@playwright/test";

test("unknown shop slug returns 404 on catalogue store", async ({ page }) => {
  const response = await page.goto("/shop/this-product-does-not-exist-xyz?store=fixmonger");
  expect(response?.status()).toBe(404);
});
