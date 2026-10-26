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

type Tab = "orders" | "sales" | "content" | "analytics" | "hand_painted" | "products";

type StoreOption = { id: string; slug: string; config: { brand: { appName: string } } };

type AnalyticsDashboard = {
  summary: { uniqueVisitors: number; sessions: number; bounceRate: number; newVisitors: number; returningVisitors: number };
  funnel: { step: string; count: number; conversionFromPrevious: number | null }[];
  bounceReasons: { reason: string; count: number; detail: string }[];
  topLandingPages: { path: string; sessions: number; bounceRate: number }[];
  topSources: { source: string; sessions: number; bounceRate: number }[];
  daily: { day: string; uniqueVisitors: number; sessions: number; bounceRate: number }[];
};

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
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [adminStore, setAdminStore] = useState<string>("all");
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [handPainted, setHandPainted] = useState<
    { orderId: string; status: string; sizeLabel: string; supplierEmailDraft: string }[]
  >([]);
  const [goCsv, setGoCsv] = useState("");

  async function load() {
    const [orderResponse, statsResponse, salesResponse, storesResponse] = await Promise.all([
      fetch("/api/admin/orders"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/sales"),
      fetch("/api/admin/stores"),
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
    const storesBody = await storesResponse.json();
    setStores(storesBody.stores ?? []);
    setAdminStore(storesBody.selected ?? "all");
    setAuthed(true);
  }

  async function loadAnalytics() {
    const response = await fetch("/api/admin/analytics");
    if (!response.ok) return;
    setAnalytics(await response.json());
  }

  async function switchStore(storeId: string) {
    await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    setAdminStore(storeId);
    await load();
    if (tab === "analytics") await loadAnalytics();
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (tab === "analytics" && authed) void loadAnalytics();
    if (tab === "hand_painted" && authed) {
      void fetch("/api/admin/hand-painted")
        .then((r) => r.json())
        .then((body) => setHandPainted(body.orders ?? []));
    }
  }, [tab, authed, adminStore]);

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
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm" data-testid="admin-store-switcher">
            Store
            <select className="field ml-2" value={adminStore} onChange={(event) => void switchStore(event.target.value)}>
              <option value="all">All stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.config.brand.appName}</option>
              ))}
            </select>
          </label>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "orders" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("orders")}>Orders</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "sales" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("sales")} data-testid="admin-sales-tab">Sales</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "analytics" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("analytics")} data-testid="admin-analytics-tab">Analytics</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "content" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("content")} data-testid="admin-content-tab">Content queue</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "hand_painted" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("hand_painted")} data-testid="admin-hand-painted-tab">Hand-painted</button>
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "products" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("products")} data-testid="admin-products-tab">Products</button>
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

      {tab === "analytics" && analytics ? (
        <section className="mt-6 space-y-6" data-testid="admin-analytics-panel">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Unique visitors</p><p className="text-2xl">{analytics.summary.uniqueVisitors}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Sessions</p><p className="text-2xl">{analytics.summary.sessions}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Bounce rate</p><p className="text-2xl">{Math.round(analytics.summary.bounceRate * 100)}%</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">New</p><p className="text-2xl">{analytics.summary.newVisitors}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Returning</p><p className="text-2xl">{analytics.summary.returningVisitors}</p></article>
          </div>
          <div>
            <h2 className="text-2xl">Funnel</h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-cream/60"><tr><th>Step</th><th>Count</th><th>Step conversion</th></tr></thead>
              <tbody>
                {analytics.funnel.map((row) => (
                  <tr key={row.step} className="border-t border-line">
                    <td className="py-2">{row.step}</td>
                    <td>{row.count}</td>
                    <td>{row.conversionFromPrevious == null ? "—" : `${Math.round(row.conversionFromPrevious * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-2xl">Why people leave</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {analytics.bounceReasons.map((row) => (
                <li key={row.reason} className="rounded-2xl border border-line p-3">{row.reason} · {row.count} <span className="text-cream/60">({row.detail})</span></li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

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

      {tab === "hand_painted" ? (
        <section className="mt-6 space-y-4" data-testid="admin-hand-painted-panel">
          <p className="text-sm text-cream/70">Paid hand-painted orders — copy the supplier email draft and send manually to ArtInBulk.</p>
          {handPainted.length === 0 ? <p>No hand-painted orders yet.</p> : null}
          {handPainted.map((row) => (
            <article key={row.orderId} className="rounded-2xl border border-line p-4">
              <p className="font-medium">{row.sizeLabel} · {row.status}</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-cream/80">{row.supplierEmailDraft}</pre>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "products" ? (
        <section className="mt-6 space-y-4" data-testid="admin-products-panel">
          <p className="text-sm text-cream/70">Catalogue stores: export paid Go Dropship UK orders as CSV for manual upload.</p>
          <button
            type="button"
            className="rounded-full bg-pumpkin px-4 py-2 text-ink disabled:opacity-40"
            data-testid="go-dropship-export"
            disabled={adminStore !== "fixmonger" && adminStore !== "jinglefold"}
            onClick={async () => {
              const response = await fetch("/api/admin/go-dropship-export", { method: "POST" });
              const body = await response.json();
              if (!response.ok) {
                setError(body.error || "Export failed");
                return;
              }
              setGoCsv(body.csv ?? "");
            }}
          >
            Download Go Dropship CSV
          </button>
          {goCsv ? (
            <pre className="max-h-64 overflow-auto rounded-2xl border border-line p-3 text-xs" data-testid="go-dropship-csv">{goCsv}</pre>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
