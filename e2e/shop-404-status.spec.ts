import { test, expect } from "@playwright/test";

test.describe("production server status codes", () => {
  test("unknown shop slug returns HTTP 404 on next start", async ({ request }) => {
    const response = await request.get("/shop/this-product-does-not-exist-xyz?store=fixmonger");
    expect(response.status()).toBe(404);
  });
});
