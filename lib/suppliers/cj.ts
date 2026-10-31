import type { ShopOrder } from "@/lib/catalogue/types";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export function cjEnabled() {
  return Boolean(process.env.CJ_ACCESS_TOKEN?.trim());
}

export function cjSandbox() {
  return process.env.CJ_SANDBOX === "true" || process.env.CJ_IS_SANDBOX === "true";
}

export async function cjListProductsGb() {
  if (!cjEnabled()) return { mocked: true, items: [] as { sku: string; name: string }[] };
  const url = `${BASE}/product/listV2?countryCode=GB&pageNum=1&pageSize=20`;
  const response = await fetch(url, { headers: { "CJ-Access-Token": process.env.CJ_ACCESS_TOKEN! } });
  if (!response.ok) throw new Error(`CJ listV2 failed (${response.status})`);
  const payload = (await response.json()) as { data?: { list?: { sku: string; productNameEn?: string }[] } };
  const items = (payload.data?.list ?? []).map((row) => ({ sku: row.sku, name: row.productNameEn ?? row.sku }));
  return { mocked: false, items };
}

/** payType 3 = create order only (no auto-pay). */
export async function cjCreateOrderV2(order: ShopOrder) {
  if (!cjEnabled()) {
    return { mocked: true, cjOrderId: `mock_cj_${order.id.slice(0, 8)}` };
  }
  if (!order.shipping) throw new Error("Shipping required");
  const body = {
    orderNumber: order.id,
    shippingCountryCode: order.shipping.countryCode,
    shippingProvince: "",
    shippingCity: order.shipping.city,
    shippingAddress: order.shipping.line1,
    shippingCustomerName: order.shipping.name,
    shippingZip: order.shipping.postalCode,
    fromCountryCode: "GB",
    payType: 3,
    isSandbox: cjSandbox(),
    products: order.lines.map((line) => ({
      vid: line.supplierSku,
      quantity: line.quantity,
    })),
  };
  const response = await fetch(`${BASE}/shopping/order/createOrderV2`, {
    method: "POST",
    headers: {
      "CJ-Access-Token": process.env.CJ_ACCESS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: { orderId?: string } };
  if (!response.ok) throw new Error(`CJ createOrderV2 failed (${response.status})`);
  return { mocked: false, cjOrderId: payload.data?.orderId ?? "unknown" };
}
