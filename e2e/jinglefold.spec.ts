import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { adminPassword } from "./helpers";

const sample = path.join(process.cwd(), "public/examples/pet-before.jpg");

test.describe("Jinglefold @mock", () => {
  test.setTimeout(120_000);

  test("personalised bauble preview then paid", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/?store=jinglefold");
    const email = `bauble-${Date.now()}@jinglefold.test`;
    const create = await page.request.post("/api/jinglefold/orders", {
      data: {
        productSlug: "personalised-shatterproof-bauble",
        email,
        styleId: "hearthside",
        subjectType: "pet",
        photoConsent: true,
        digitalSupplyConsent: true,
        personalisedConsent: true,
      },
    });
    expect(create.ok()).toBeTruthy();
    const order = await create.json();
    const upload = await page.request.post("/api/uploads", {
      multipart: {
        orderId: order.orderId,
        uploadToken: order.uploadToken,
        file: {
          name: "pet.jpg",
          mimeType: "image/jpeg",
          buffer: fs.readFileSync(sample),
        },
      },
    });
    expect(upload.ok()).toBeTruthy();
    const start = await page.request.patch("/api/jinglefold/orders", {
      data: { orderId: order.orderId, uploadToken: order.uploadToken },
    });
    expect(start.ok()).toBeTruthy();
    let preview: { orderId: string; uploadToken: string } | null = null;
    for (let i = 0; i < 15; i++) {
      await page.request.post("/api/dev/process");
      const gallery = await page.request.get(`/api/results/${order.resultsToken}`);
      if (gallery.ok()) {
        const body = await gallery.json();
        if (body.previewCheckout && body.images?.length && body.order?.id) {
          preview = { orderId: body.order.id, uploadToken: body.order.uploadToken };
          break;
        }
      }
      await page.waitForTimeout(500);
    }
    expect(preview).toBeTruthy();
    const checkout = await page.request.post("/api/checkout", {
      data: {
        kind: "portrait",
        orderId: preview!.orderId,
        uploadToken: preview!.uploadToken,
      },
    });
    expect(checkout.ok()).toBeTruthy();
    const checkoutBody = await checkout.json();
    await page.goto(checkoutBody.url);
    await page.waitForURL(/session_id=|checkout\/success/, { timeout: 60_000 });
    const after = await page.request.get(`/api/results/${order.resultsToken}`);
    expect(after.ok()).toBeTruthy();
    const paidGallery = await after.json();
    expect(paidGallery.ready).toBe(true);
    expect(paidGallery.previewCheckout).toBeFalsy();
  });

  test("personalised bauble checkout", async ({ page }) => {
    await page.goto("/?store=jinglefold");
    const email = `jingle-${Date.now()}@jinglefold.test`;
    const create = await page.request.post("/api/jinglefold/orders", {
      data: {
        productSlug: "personalised-shatterproof-bauble",
        email,
        styleId: "cosy-classic",
        subjectType: "pet",
        photoConsent: true,
        digitalSupplyConsent: true,
        personalisedConsent: true,
      },
    });
    expect(create.ok()).toBeTruthy();
    const order = await create.json();
    const upload = await page.request.post("/api/uploads", {
      multipart: {
        orderId: order.orderId,
        uploadToken: order.uploadToken,
        file: {
          name: "pet.jpg",
          mimeType: "image/jpeg",
          buffer: fs.readFileSync(sample),
        },
      },
    });
    expect(upload.ok()).toBeTruthy();
    const checkout = await page.request.post("/api/checkout", {
      data: {
        kind: "portrait",
        orderId: order.orderId,
        uploadToken: order.uploadToken,
      },
    });
    expect(checkout.ok()).toBeTruthy();
    const body = await checkout.json();
    await page.goto(body.url);
    await page.waitForURL(/session_id=/, { timeout: 60_000 });
  });

  test("decor checkout and Go Dropship export", async ({ page }) => {
    await page.goto("/?store=jinglefold");
    const email = `decor-${Date.now()}@jinglefold.test`;
    const response = await page.request.post("/api/shop/checkout", {
      data: {
        email,
        lines: [{ productId: "hom-55255", quantity: 1 }],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    await page.goto(body.url);
    await page.waitForURL(/\/shop\/success/, { timeout: 60_000 });
    const login = await page.request.post("/api/admin/login", { data: { password: adminPassword } });
    expect(login.ok()).toBeTruthy();
    await page.request.patch("/api/admin/stores", { data: { storeId: "jinglefold" } });
    const exportResponse = await page.request.post("/api/admin/go-dropship-export");
    expect(exportResponse.ok()).toBeTruthy();
  });
});
