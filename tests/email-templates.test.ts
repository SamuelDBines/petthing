import assert from "node:assert/strict";
import test from "node:test";
import { brandedEmailMatrix, BISHOP_CO_FOOTER_LINE } from "../lib/email/templates/constants";
import { renderBrandedEmail } from "../lib/email/templates/render";
import { samplePayload } from "../lib/email/templates/sample-data";

test("branded email matrix has 17 store/kind combinations", () => {
  assert.equal(brandedEmailMatrix().length, 17);
  assert.equal(
    brandedEmailMatrix().some((row) => row.storeId === "fixmonger" && row.kind === "portrait_ready"),
    false,
  );
});

test("each branded template renders HTML and text with company footer", async () => {
  for (const { storeId, kind } of brandedEmailMatrix()) {
    const rendered = await renderBrandedEmail(storeId, kind, samplePayload(storeId, kind));
    assert.ok(rendered.html.includes(BISHOP_CO_FOOTER_LINE), `${storeId}/${kind} missing footer`);
    assert.ok(rendered.html.includes("color-scheme"), `${storeId}/${kind} missing dark-mode meta`);
    assert.ok(rendered.text.includes(BISHOP_CO_FOOTER_LINE), `${storeId}/${kind} text footer`);
    assert.match(rendered.html, /role="presentation"/);
    if (kind === "welcome" || kind === "abandoned_checkout") {
      assert.equal(rendered.fromRole, "hello");
      assert.ok(rendered.listUnsubscribe);
    } else {
      assert.equal(rendered.fromRole, "orders");
    }
  }
});
