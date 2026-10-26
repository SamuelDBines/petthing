import type { ShopOrder } from "@/lib/catalogue/types";

/** Go Dropship UK batch CSV (uploaded manually by ops). */
export function buildGoDropshipCsv(orders: ShopOrder[]) {
  const header = ["OrderRef", "SKU", "Qty", "Name", "Address1", "Address2", "City", "Postcode", "Country", "Email"];
  const rows = orders.flatMap((order) => {
    if (!order.shipping) return [];
    return order.lines.map((line) => [
      order.id,
      line.supplierSku,
      String(line.quantity),
      order.shipping!.name,
      order.shipping!.line1,
      order.shipping!.line2,
      order.shipping!.city,
      order.shipping!.postalCode,
      order.shipping!.countryCode,
      order.email,
    ]);
  });
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
