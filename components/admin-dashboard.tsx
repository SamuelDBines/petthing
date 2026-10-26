"use client";

import { useEffect, useState } from "react";
import { formatGbp } from "@/config/pricing";
import { THEMES } from "@/config/themes";
import { orderPipelineStatus, printSummary } from "@/lib/adminDisplay";
import type { Order, PrintOrder } from "@/lib/domain";

type OrderRow = Order & {
  prints: PrintOrder[];
};

type Stats = {
  todayRevenue: string;
  todayOrders: number;
  todaySpendGbp: number;
  createStarts: number;
  paid: number;
  createStartsToday: number;
  paidToday: number;
};

type Sales = {
  days: { date: string; revenue: string; orders: number }[];
  today: { generationSpendGbp: number; generationCapGbp: number; reviewQueue: number };
  contentWorkerUrl: string;
  contentWorkerToken: string;
};

type Tab = "orders" | "sales" | "content";

export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [preorders, setPreorders] = useState<{ id: string; email: string; status: string; amountPence: number }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<Sales | null>(null);
  const [settings, setSettings] = useState({ themeMode: "auto", activeThemeId: "halloween", salesPaused: false, queueHalted: false });
  const [error, setError] = useState("");
  const [styleId, setStyleId] = useState<Record<string, string>>({});

  async function load() {
    const [orderResponse, statsResponse, salesResponse] = await Promise.all([
      fetch("/api/admin/orders"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/sales"),
    ]);
    if (orderResponse.status === 401) {
      setAuthed(false);
      return;
    }
    const orderBody = await orderResponse.json();
    const statsBody = await statsResponse.json();
    const salesBody = await salesResponse.json();
    setOrders(orderBody.orders);
    setPreorders(orderBody.preorders ?? []);
    setSettings(orderBody.settings);
    setStats(statsBody);
    setSales(salesBody);
    setAuthed(true);
  }

  useEffect(() => {
    void load();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not sign in");
      return;
    }
    setError("");
    await load();
  }

  async function act(id: string, action: string, chosenStyle?: string) {
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, styleId: chosenStyle }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Action failed");
    await load();
  }

  async function saveSettings(next: typeof settings) {
    setSettings(next);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16" data-testid="admin-login">
        <h1 className="text-4xl">Admin</h1>
        <form onSubmit={login} className="mt-6 space-y-3">
          <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" data-testid="admin-password" />
          <button className="rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink" type="submit">Sign in</button>
          {error ? <p className="text-sm">{error}</p> : null}
        </form>
      </main>
    );
  }

  const conversion = stats && stats.createStarts ? Math.round((stats.paid / stats.createStarts) * 100) : 0;
  const reviewCount = orders.filter((order) => order.status === "review").length;
  const contentUrl = sales ? `${sales.contentWorkerUrl}?token=${encodeURIComponent(sales.contentWorkerToken)}` : "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Admin</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "orders" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("orders")}>Orders</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "sales" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("sales")} data-testid="admin-sales-tab">Sales</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "content" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("content")} data-testid="admin-content-tab">Content queue</button>
          <button className="rounded-full border border-line px-4 py-2" onClick={() => fetch("/api/admin/run-queue", { method: "POST" }).then(load)}>Run queue</button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
      {stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Today</p><p className="text-2xl">{stats.todayRevenue}</p><p className="text-sm">{stats.todayOrders} orders</p></article>
          <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Generation today</p><p className="text-2xl">£{stats.todaySpendGbp.toFixed(2)}</p><p className="text-sm">cap £{sales?.today.generationCapGbp ?? 25}</p></article>
          <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Review queue</p><p className="text-2xl">{reviewCount}</p></article>
          <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Start → paid</p><p className="text-2xl">{conversion}%</p><p className="text-sm">{stats.paid} / {stats.createStarts}</p></article>
          <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Today’s funnel</p><p className="text-2xl">{stats.paidToday}</p><p className="text-sm">{stats.createStartsToday} starts</p></article>
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 rounded-3xl border border-line p-4 md:grid-cols-4">
        <label className="text-sm">Theme
          <select className="field mt-1" value={settings.themeMode === "auto" ? "auto" : settings.activeThemeId} onChange={(event) => {
            const value = event.target.value;
            const next = value === "auto" ? { ...settings, themeMode: "auto" as const } : { ...settings, themeMode: "manual" as const, activeThemeId: value };
            void saveSettings(next);
          }}>
            <option value="auto">Automatic by date</option>
            {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.salesPaused} onChange={(event) => saveSettings({ ...settings, salesPaused: event.target.checked })} /> Sold out / paused</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.queueHalted} onChange={(event) => saveSettings({ ...settings, queueHalted: event.target.checked })} /> Halt generation queue</label>
      </section>

      {tab === "sales" && sales ? (
        <section className="mt-6" data-testid="admin-sales-panel">
          <h2 className="text-2xl">Revenue by day</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-cream/60"><tr><th>Date (London)</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>
              {sales.days.map((row) => (
                <tr key={row.date} className="border-t border-line">
                  <td className="py-2">{row.date}</td>
                  <td>{row.orders}</td>
                  <td>{row.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "content" && contentUrl ? (
        <section className="mt-6" data-testid="admin-content-panel">
          <p className="text-sm text-cream/70">Content worker approval queue (dry-run). <a className="underline" href={contentUrl} target="_blank" rel="noreferrer">Open in new tab</a></p>
          <iframe title="Content approval queue" src={contentUrl} className="mt-3 h-[min(70vh,720px)] w-full rounded-3xl border border-line bg-ink" />
        </section>
      ) : null}

      {tab === "orders" ? (
        <>
          {preorders.length ? (
            <section className="mt-6 text-sm">
              <h2 className="text-2xl">Christmas pre-orders</h2>
              <ul className="mt-2 space-y-1">
                {preorders.map((preorder) => (
                  <li key={preorder.id}>{preorder.email} · {preorder.status} · {formatGbp(preorder.amountPence)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-6 overflow-x-auto" data-testid="admin-orders-table">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-cream/60"><tr><th>When</th><th>Email</th><th>Pipeline</th><th>Tier</th><th>Paid</th><th>Gen cost</th><th></th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-line align-top" data-testid={`admin-order-${order.id}`}>
                    <td className="py-3">{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                    <td>{order.email}{order.priority ? " · priority" : ""}<br />{order.failureReason ? <span className="text-danger">{order.failureReason}</span> : null}</td>
                    <td>
                      <span data-testid="order-pipeline-status">{orderPipelineStatus(order, order.prints)}</span>
                      {order.prints.map((print) => (
                        <span key={print.id} className="mt-1 block text-cream/60">{print.productId}: {printSummary(print)}</span>
                      ))}
                    </td>
                    <td>{order.tierId}</td>
                    <td>{formatGbp(order.amountPence)}</td>
                    <td>£{order.generationCostGbp.toFixed(2)}</td>
                    <td className="space-y-2 py-3">
                      {order.status === "review" ? <button className="block rounded-full bg-pumpkin px-3 py-1 text-ink" onClick={() => act(order.id, "approve")} data-testid="approve-order">Approve</button> : null}
                      <select className="field" value={styleId[order.id] || order.styleIds[0] || ""} onChange={(event) => setStyleId({ ...styleId, [order.id]: event.target.value })}>
                        {order.styleIds.map((id) => <option key={id} value={id}>{id}</option>)}
                      </select>
                      <button className="block" type="button" onClick={() => act(order.id, "regenerate", styleId[order.id] || order.styleIds[0])}>Regenerate style</button>
                      <button className="block" type="button" onClick={() => act(order.id, "resend")}>Resend email</button>
                      <button className="block" type="button" onClick={() => act(order.id, "refund")}>Refund</button>
                      {order.status === "delivered" ? <a className="block" href={`/results/${order.resultsToken}`}>Gallery</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
