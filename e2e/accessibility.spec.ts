import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const stores = ["pawtraitry", "fixmonger", "jinglefold"] as const;

for (const store of stores) {
  test.describe(`${store} accessibility`, () => {
    test(`home meets WCAG colour contrast @a11y`, async ({ page }) => {
      await page.goto(`/?store=${store}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"]).analyze();
      const contrast = results.violations.filter((v) => v.id === "color-contrast");
      expect(contrast, JSON.stringify(contrast, null, 2)).toEqual([]);
    });
  });
}
