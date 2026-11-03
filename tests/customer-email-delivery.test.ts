import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.join(import.meta.dirname, "..");

const SCAN_DIRS = ["lib", "app"] as const;

/** Files that may call sendEmail without customer delivery fields (internal/supplier inboxes). */
const ALLOWLIST = new Set([
  "lib/email/send.ts",
  "lib/email.ts",
  "lib/ops/admin-digest.ts",
  "lib/handPainted.ts",
  "lib/shop/admin-order-actions.ts",
  "scripts/email-samples.ts",
]);

const DELIVERY_MARKERS = [
  "stripeLivemode",
  "requestHost",
  "withEmailDelivery",
  "orderEmailDelivery",
];

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules") continue;
      walk(full, acc);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(file: string) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function sendEmailBlocks(source: string): { index: number; block: string }[] {
  const blocks: { index: number; block: string }[] = [];
  const needle = "sendEmail(";
  let from = 0;
  while (true) {
    const start = source.indexOf(needle, from);
    if (start === -1) break;
    let depth = 0;
    let i = start + needle.length - 1;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          blocks.push({ index: start, block: source.slice(start, i + 1) });
          break;
        }
      }
    }
    from = start + needle.length;
  }
  return blocks;
}

test("customer sendEmail call sites include delivery context", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const violations: string[] = [];

  for (const file of files) {
    const key = rel(file);
    if (ALLOWLIST.has(key)) continue;
    const source = readFileSync(file, "utf8");
    if (!source.includes("sendEmail(")) continue;
    for (const { block } of sendEmailBlocks(source)) {
      if (DELIVERY_MARKERS.some((m) => block.includes(m))) continue;
      violations.push(`${key}: ${block.slice(0, 120).replace(/\s+/g, " ")}…`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Missing stripeLivemode/requestHost/withEmailDelivery on:\n${violations.join("\n")}`,
  );
});

test("assertCustomerEmailDelivery rejects customer sends without context", async () => {
  const { assertCustomerEmailDelivery } = await import("../lib/email/delivery-context");
  assert.throws(() =>
    assertCustomerEmailDelivery({
      to: "buyer@example.com",
      subject: "Hi",
      html: "<p>x</p>",
      storeId: "pawtraitry",
    }),
  );
  assert.doesNotThrow(() =>
    assertCustomerEmailDelivery({
      to: "buyer@example.com",
      subject: "Hi",
      html: "<p>x</p>",
      storeId: "pawtraitry",
      stripeLivemode: true,
    }),
  );
});
