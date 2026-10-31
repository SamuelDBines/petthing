import { test, expect } from "@playwright/test";
import path from "path";

const artifactRoot = path.join(process.cwd(), "artifacts/visual");

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

for (const store of ["fixmonger", "jinglefold"] as const) {
  test.describe(`${store} visual regression @screenshots`, () => {
    for (const viewport of viewports) {
      test(`home ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`/?store=${store}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.screenshot({
          path: path.join(artifactRoot, store, `home-${viewport.name}.png`),
          fullPage: true,
        });
      });

      test(`pdp ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const slug = store === "fixmonger" ? "hom-76459" : "gem-76745";
        await page.goto(`/shop/${slug}?store=${store}`);
        await expect(page.getByTestId("shop-product-detail")).toBeVisible();
        await page.screenshot({
          path: path.join(artifactRoot, store, `pdp-${viewport.name}.png`),
          fullPage: true,
        });
      });
    }
  });
}
