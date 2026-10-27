import { test, expect } from "@playwright/test";

test.describe("production server status codes", () => {
  test("unknown shop slug returns HTTP 404 on next start", async ({ request }) => {
    const response = await request.get("/shop/this-product-does-not-exist-xyz?store=fixmonger");
    expect(response.status()).toBe(404);
  });

  test("reserved shop routes return HTTP 200", async ({ request }) => {
    for (const path of ["/shop/cart", "/shop/success"]) {
      const response = await request.get(`${path}?store=fixmonger`);
      expect(response.status()).toBe(200);
    }
  });
});
