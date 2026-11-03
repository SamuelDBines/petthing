import { formatGbp } from "@/config/pricing";
import { buildDashboard, rollupForEmptyRange } from "@/lib/analytics/dashboard";
import { londonDay } from "@/lib/runtime";
import { sendEmail } from "@/lib/email";
import { findStuckShopOrders } from "@/lib/ops/order-watchdog";
import { getStore } from "@/lib/store";
import { listBuiltinStores } from "@/lib/tenant/resolve";

export async function buildAdminDigestHtml() {
  const store = getStore();
  const stores = listBuiltinStores();
  const sections: string[] = [];
  const { paidStuck, trackingStuck } = await findStuckShopOrders();

  for (const cfg of stores) {
    const id = cfg.id;
    const shopOrders = await store.listShopOrders(id);
    const today = new Date().toISOString().slice(0, 10);
    const paidToday = shopOrders.filter((o) => o.paidAt?.startsWith(today));
    const revenue = paidToday.reduce((s, o) => s + o.amountPence, 0);
    const margin = paidToday.reduce(
      (s, o) => s + o.lines.reduce((ls, line) => ls + (line.unitPricePence - line.costPence) * line.quantity, 0),
      0,
    );
    const portraitOrders = await store.listOrders(id);
    const failedPartner = portraitOrders.filter((o) => o.partnerFulfillment?.status === "failed").length;

    let visitors = "n/a";
    const day = londonDay();
    if (store.getAnalyticsRollups) {
      const daily = await store.getAnalyticsRollups(id, day, day);
      const dash = daily.length
        ? buildDashboard({ storeId: id, from: day, to: day, daily })
        : rollupForEmptyRange(day, day, id);
      visitors = String(dash.summary.uniqueVisitors.value);
    }

    sections.push(`
      <h2>${cfg.brand.appName} (${id})</h2>
      <ul>
        <li>Shop orders today: ${paidToday.length} · ${formatGbp(revenue)} revenue · ~${formatGbp(margin)} margin</li>
        <li>Failed partner fulfils: ${failedPartner}</li>
        <li>Visitors (24h): ${visitors}</li>
      </ul>
    `);
  }

  return `
    <h1>Daily ops digest</h1>
    <p>Stuck paid (Go Dropship): ${paidStuck.length} · Stuck tracking: ${trackingStuck.length}</p>
    ${sections.join("")}
  `;
}

export async function sendAdminDigestEmail() {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return { sent: false as const, reason: "ADMIN_EMAIL unset" };
  const html = await buildAdminDigestHtml();
  await sendEmail({ to, subject: "Daily store digest", html });
  return { sent: true as const };
}
