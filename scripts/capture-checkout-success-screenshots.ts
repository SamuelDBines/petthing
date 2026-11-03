#!/usr/bin/env tsx
/**
 * Capture checkout success preview states for walkthrough artifacts.
 * Requires: npm run build && PORT=3099 npm run start (in another terminal).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const PHASES = [
  "confirming",
  "generating",
  "ready",
  "review",
  "failed",
  "refunded",
  "expired_unpaid",
  "christmas_booked",
] as const;

const WIDTHS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3099";
const outDir =
  process.env.CURSOR_ARTIFACTS_DIR ||
  process.env.CURSOR_ARTIFACTS ||
  "/opt/cursor/artifacts/screenshots";

async function shot(page: Page, phase: string, widthName: string) {
  const file = path.join(outDir, `checkout-success-${phase}-${widthName}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const { name, width, height } of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    for (const phase of PHASES) {
      await page.goto(`${baseUrl}/checkout/success/preview?state=${phase}`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="checkout-success"]');
      await shot(page, phase, name);
    }
    await context.close();
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
