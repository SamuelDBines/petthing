import { test, expect } from "@playwright/test";
import path from "path";
import { adminPassword } from "./helpers";

const screenshotDir = path.join(process.cwd(), "artifacts/screenshots");

test.describe("Fixmonger catalogue @mock", () => {
  test.setTimeout(120_000);

  test("buy two items and export Go Dropship CSV", async ({ page }) => {
    await page.goto("/?store=fixmonger");
    await expect(page.getByText("Cheap fixes for proper British weather")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
    const email = `fix-${Date.now()}@fixmonger.test`;
    const checkoutResponse = await page.request.post("/api/shop/checkout", {
      data: {
        email,
        lines: [
          { productId: "hom-76459", quantity: 1 },
          { productId: "car-46787", quantity: 1 },
        ],
      },
    });
    expect(checkoutResponse.ok()).toBeTruthy();
    const checkoutBody = await checkoutResponse.json();
    await page.goto(checkoutBody.url);
    await page.waitForURL(/\/shop\/success/, { timeout: 60_000 });
    const login = await page.request.post("/api/admin/login", { data: { password: adminPassword } });
    expect(login.ok()).toBeTruthy();
    await page.request.patch("/api/admin/stores", { data: { storeId: "fixmonger" } });
    const exportResponse = await page.request.post("/api/admin/go-dropship-export");
    expect(exportResponse.ok()).toBeTruthy();
    const exportBody = await exportResponse.json();
    expect(exportBody.csv).toContain("HOM-");

    await page.screenshot({ path: path.join(screenshotDir, "fixmonger-checkout-success.png"), fullPage: true });
  });

  test("product card navigates to PDP", async ({ page }) => {
    await page.goto("/?store=fixmonger");
    const link = page.getByTestId("product-card-link").first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/shop\//);
    await link.click();
    await page.waitForURL(/\/shop\/[^/?#]+/, { timeout: 15_000 });
    await expect(page.getByTestId("shop-product-detail")).toBeVisible();
  });

  test("screenshots @screenshots", async ({ page }) => {
    await page.goto("/?store=fixmonger");
    await expect(page.getByRole("button", { name: "Add to cart" }).first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "fixmonger-home.png"), fullPage: true });
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await page.getByTestId("shop-cart-button").click();
    await page.screenshot({ path: path.join(screenshotDir, "fixmonger-cart.png"), fullPage: true });
  });
});
