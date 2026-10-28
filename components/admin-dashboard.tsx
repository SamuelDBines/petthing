"use client";

import { useEffect, useState } from "react";
import { formatGbp } from "@/config/pricing";
import { THEMES } from "@/config/themes";
import { orderPipelineStatus, printSummary } from "@/lib/adminDisplay";
import type { ShopOrder } from "@/lib/catalogue/types";
import { AdminShopOrderPanel } from "@/components/admin-shop-order-panel";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { Order, PrintOrder } from "@/lib/domain";
import { signInWithGoogle } from "@/app/admin/google-sign-in-action";

type PortraitJobRow = { styleId: string; variantIndex: number; status: string };
type OrderRow = Order & {
  prints: PrintOrder[];
  portraitProgress?: { generated: number; expected: number; complete: boolean };
  portraitJobs?: PortraitJobRow[];
  pendingReplacements?: { styleId: string | null; variantIndex: number | null }[];
};

type Stats = {
  todayRevenue: string;
  todayOrders: number;
  todaySpendGbp: number;
  createStarts: number;
  paid: number;
  createStartsToday: number;
  paidToday: number;
  fulfilment?: {
    portraitReview: number;
    shopPaidAwaitingExport: number;
    handPaintedOpen: number;
    generating: number;
  };
  storeBreakdown?: {
    storeId: string;
    todayRevenue: string;
    reviewQueue: number;
    shopPaidQueue: number;
    generating: number;
  }[];
};

type Sales = {
  days: { date: string; revenue: string; orders: number }[];
  today: { generationSpendGbp: number; generationCapGbp: number; reviewQueue: number };
  contentWorkerUrl: string;
  contentWorkerToken: string;
};

type Tab = "orders" | "sales" | "content" | "analytics" | "hand_painted" | "products" | "stores";

type StoreOption = {
  id: string;
  slug: string;
  domains?: string[];
  config: { brand: { appName: string; tagline?: string; supportEmail?: string } };
  settings?: { salesPaused: boolean; queueHalted: boolean };
};

type AnalyticsDashboard = {
  summary: { uniqueVisitors: number; sessions: number; bounceRate: number; newVisitors: number; returningVisitors: number };
  funnel: { step: string; count: number; conversionFromPrevious: number | null }[];
  bounceReasons: { reason: string; count: number; detail: string }[];
  topLandingPages: { path: string; sessions: number; bounceRate: number }[];
  topSources: { source: string; sessions: number; bounceRate: number }[];
  daily: { day: string; uniqueVisitors: number; sessions: number; bounceRate: number }[];
  byStore?: Record<string, AnalyticsDashboard>;
};

type StoreEdit = {
  domains: string;
  tagline: string;
  supportEmail: string;
  salesPaused: boolean;
  queueHalted: boolean;
};

type LoginEvent = { id: string; email: string; ip: string; createdAt: string };

type AdminDashboardProps = {
  initialAuthed?: boolean;
  oauthEnabled?: boolean;
  passwordLogin?: boolean;
};

export function AdminDashboard({
  initialAuthed = false,
  oauthEnabled = true,
  passwordLogin = false,
}: AdminDashboardProps) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(initialAuthed);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [orderStoreFilter, setOrderStoreFilter] = useState<string>("all");
  const [preorders, setPreorders] = useState<{ id: string; email: string; status: string; amountPence: number }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<Sales | null>(null);
  const [settings, setSettings] = useState({ themeMode: "auto", activeThemeId: "halloween", salesPaused: false, queueHalted: false });
  const [error, setError] = useState("");
  const [styleId, setStyleId] = useState<Record<string, string>>({});
  const [variantIndex, setVariantIndex] = useState<Record<string, number>>({});
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [adminStore, setAdminStore] = useState<string>("all");
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [handPainted, setHandPainted] = useState<
    { orderId: string; status: string; sizeLabel: string; supplierEmailDraft: string }[]
  >([]);
  const [goCsv, setGoCsv] = useState("");
  const [catalogueByStore, setCatalogueByStore] = useState<Record<string, CatalogueProduct[]>>({});
  const [storeEdits, setStoreEdits] = useState<Record<string, StoreEdit>>({});

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
    setShopOrders(orderBody.shopOrders ?? []);
    setPreorders(orderBody.preorders ?? []);
    setSettings(orderBody.settings);
    setStats(statsBody);
    setSales(salesBody);
    const storesBody = await storesResponse.json();
    setStores(storesBody.stores ?? []);
    setAdminStore(storesBody.selected ?? "all");
    setAuthed(true);
    void fetch("/api/admin/login-audit")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((body) => setLoginEvents(body.events ?? []));
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

  async function loadProducts() {
    const response = await fetch("/api/admin/products");
    if (!response.ok) return;
    const body = await response.json();
    if (body.byStore) setCatalogueByStore(body.byStore);
    else if (body.products) setCatalogueByStore({ [adminStore]: body.products });
  }

  function initStoreEditsFromList(list: StoreOption[]) {
    const next: Record<string, StoreEdit> = {};
    for (const store of list) {
      next[store.id] = {
        domains: store.domains?.join(", ") ?? "",
        tagline: store.config.brand.tagline ?? "",
        supportEmail: store.config.brand.supportEmail ?? "",
        salesPaused: store.settings?.salesPaused ?? false,
        queueHalted: store.settings?.queueHalted ?? false,
      };
    }
    setStoreEdits(next);
  }

  function storeLabel(storeId: string) {
    return stores.find((s) => s.id === storeId)?.config.brand.appName ?? storeId;
  }

  async function saveStoreRow(storeId: string) {
    const edit = storeEdits[storeId];
    if (!edit) return;
    const response = await fetch(`/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domains: edit.domains.split(",").map((d) => d.trim()).filter(Boolean),
        tagline: edit.tagline,
        supportEmail: edit.supportEmail,
        salesPaused: edit.salesPaused,
        queueHalted: edit.queueHalted,
      }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Could not save store");
    else {
      setError("");
      await load();
    }
  }

  async function saveProduct(storeId: string, productId: string, patch: { pricePence?: number; stock?: number; active?: boolean }) {
    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, productId, ...patch }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not save product");
      return;
    }
    await loadProducts();
  }

  useEffect(() => {
    if (tab === "analytics" && authed) void loadAnalytics();
    if (tab === "hand_painted" && authed) {
      void fetch("/api/admin/hand-painted")
        .then((r) => r.json())
        .then((body) => setHandPainted(body.orders ?? []));
    }
    if (tab === "products" && authed) void loadProducts();
  }, [tab, authed, adminStore]);

  useEffect(() => {
    if (tab === "stores" && stores.length) initStoreEditsFromList(stores);
  }, [stores, tab]);

  useEffect(() => {
    if (adminStore !== "all") setOrderStoreFilter(adminStore);
    else setOrderStoreFilter("all");
  }, [adminStore]);

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

  async function act(id: string, action: string, chosenStyle?: string, chosenVariant?: number) {
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        styleId: chosenStyle,
        variantIndex: chosenVariant,
      }),
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
        {oauthEnabled ? (
          <form action={signInWithGoogle} className="mt-6">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink"
              data-testid="admin-google-signin"
            >
              Sign in with Google
            </button>
          </form>
        ) : null}
        {passwordLogin ? (
          <form onSubmit={login} className="mt-6 space-y-3">
            <p className="text-xs text-cream/60">Dev / E2E password login</p>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" data-testid="admin-password" />
            <button className="rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink" type="submit">Sign in with password</button>
          </form>
        ) : null}
        {!oauthEnabled && !passwordLogin ? (
          <p className="mt-6 text-sm text-cream/70">Configure Google OAuth or enable ADMIN_PASSWORD_LOGIN for local access.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm">{error}</p> : null}
      </main>
    );
  }

  const conversion = stats && stats.createStarts ? Math.round((stats.paid / stats.createStarts) * 100) : 0;
  const reviewCount = stats?.fulfilment?.portraitReview ?? orders.filter((order) => order.status === "review").length;
  const contentUrl = sales ? `${sales.contentWorkerUrl}?token=${encodeURIComponent(sales.contentWorkerToken)}` : "";
  const showStoreColumn = adminStore === "all";
  const filteredPortraitOrders = orders.filter(
    (order) => orderStoreFilter === "all" || order.storeId === orderStoreFilter,
  );
  const filteredShopOrders = shopOrders.filter(
    (order) => orderStoreFilter === "all" || order.storeId === orderStoreFilter,
  );
  const catalogueStores =
    adminStore === "all" ? Object.keys(catalogueByStore) : catalogueByStore[adminStore] ? [adminStore] : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl">Admin</h1>
          <button
            type="button"
            className="mt-1 text-sm text-cream/60 underline"
            onClick={() => void fetch("/api/admin/logout", { method: "POST" }).then(() => window.location.reload())}
          >
            Sign out
          </button>
          <a className="mt-1 block text-sm text-cream/60 underline" href="/admin/health">Integration health</a>
        </div>
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
          <button type="button" className={`rounded-full px-4 py-2 ${tab === "stores" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setTab("stores")} data-testid="admin-stores-tab">Stores</button>
          <button className="rounded-full border border-line px-4 py-2" onClick={() => fetch("/api/admin/run-queue", { method: "POST" }).then(load)}>Run queue</button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
      {loginEvents.length ? (
        <section className="mt-4 rounded-3xl border border-line p-4 text-sm" data-testid="admin-login-audit">
          <h2 className="font-medium">Recent admin sign-ins</h2>
          <ul className="mt-2 space-y-1 text-cream/70">
            {loginEvents.slice(0, 8).map((row) => (
              <li key={row.id}>
                {row.email} · {new Date(row.createdAt).toLocaleString("en-GB")} · {row.ip || "—"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {stats ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Today</p><p className="text-2xl">{stats.todayRevenue}</p><p className="text-sm">{stats.todayOrders} orders</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Generation today</p><p className="text-2xl">£{stats.todaySpendGbp.toFixed(2)}</p><p className="text-sm">cap £{sales?.today.generationCapGbp ?? 25}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Review queue</p><p className="text-2xl">{reviewCount}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Start → paid</p><p className="text-2xl">{conversion}%</p><p className="text-sm">{stats.paid} / {stats.createStarts}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Today’s funnel</p><p className="text-2xl">{stats.paidToday}</p><p className="text-sm">{stats.createStartsToday} starts</p></article>
          </div>
          {stats.fulfilment ? (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="admin-fulfilment-panel">
              <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Portrait review</p><p className="text-2xl">{stats.fulfilment.portraitReview}</p></article>
              <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Shop paid (export)</p><p className="text-2xl">{stats.fulfilment.shopPaidAwaitingExport}</p></article>
              <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Hand-painted open</p><p className="text-2xl">{stats.fulfilment.handPaintedOpen}</p></article>
              <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">Generating</p><p className="text-2xl">{stats.fulfilment.generating}</p></article>
            </div>
          ) : null}
          {stats.storeBreakdown?.length ? (
            <div className="mt-3 overflow-x-auto rounded-3xl border border-line p-4" data-testid="admin-store-breakdown">
              <p className="text-sm text-cream/60">Today by store</p>
              <table className="mt-2 w-full text-left text-sm">
                <thead className="text-cream/60"><tr><th>Store</th><th>Revenue</th><th>Review</th><th>Shop paid</th><th>Generating</th></tr></thead>
                <tbody>
                  {stats.storeBreakdown.map((row) => (
                    <tr key={row.storeId} className="border-t border-line">
                      <td className="py-2">{storeLabel(row.storeId)}</td>
                      <td>{row.todayRevenue}</td>
                      <td>{row.reviewQueue}</td>
                      <td>{row.shopPaidQueue}</td>
                      <td>{row.generating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {adminStore === "all" ? (
        <p className="mt-4 text-sm text-cream/70">Select a single store in the switcher to edit theme and pause flags for that store.</p>
      ) : (
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
      )}

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
          {analytics.byStore ? (
            <div data-testid="admin-analytics-by-store">
              <h2 className="text-2xl">By store</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {Object.entries(analytics.byStore).map(([storeId, dash]) => (
                  <article key={storeId} className="rounded-2xl border border-line p-4">
                    <h3 className="font-medium">{storeLabel(storeId)}</h3>
                    <p className="mt-2 text-sm">Visitors {dash.summary.uniqueVisitors} · Sessions {dash.summary.sessions}</p>
                    <p className="text-sm">Bounce {Math.round(dash.summary.bounceRate * 100)}%</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
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

          {showStoreColumn ? (
            <label className="mt-6 block text-sm">
              Filter orders
              <select className="field ml-2" value={orderStoreFilter} onChange={(e) => setOrderStoreFilter(e.target.value)} data-testid="admin-order-store-filter">
                <option value="all">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.config.brand.appName}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="mt-6 overflow-x-auto" data-testid="admin-orders-table">
            <h2 className="mb-2 text-2xl">Portrait orders</h2>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-cream/60"><tr>{showStoreColumn ? <th>Store</th> : null}<th>When</th><th>Email</th><th>Pipeline</th><th>Tier</th><th>Paid</th><th>Gen cost</th><th></th></tr></thead>
              <tbody>
                {filteredPortraitOrders.map((order) => (
                  <tr key={order.id} className="border-t border-line align-top" data-testid={`admin-order-${order.id}`}>
                    {showStoreColumn ? <td className="py-3">{storeLabel(order.storeId)}</td> : null}
                    <td className="py-3">{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                    <td>{order.email}{order.priority ? " · priority" : ""}<br />{order.failureReason ? <span className="text-danger">{order.failureReason}</span> : null}</td>
                    <td>
                      <span data-testid="order-pipeline-status">{orderPipelineStatus(order, order.prints)}</span>
                      {order.portraitProgress && order.portraitProgress.expected > 0 ? (
                        <span
                          className={`mt-1 block text-xs ${order.portraitProgress.complete ? "text-cream/60" : "text-amber-200"}`}
                          data-testid="portrait-generation-progress"
                        >
                          {order.portraitProgress.generated} of {order.portraitProgress.expected} generated
                        </span>
                      ) : null}
                      {order.prints.map((print) => (
                        <span key={print.id} className="mt-1 block text-cream/60">{print.productId}: {printSummary(print)}</span>
                      ))}
                      {order.partnerFulfillment?.externalOrderId ? (
                        <span className="mt-1 block text-cream/60">
                          {order.partnerFulfillment.provider}: {order.partnerFulfillment.status}
                          {order.partnerFulfillment.trackingNumber ? ` · ${order.partnerFulfillment.trackingNumber}` : ""}
                        </span>
                      ) : null}
                    </td>
                    <td>{order.tierId}</td>
                    <td>{formatGbp(order.amountPence)}</td>
                    <td>£{order.generationCostGbp.toFixed(2)}</td>
                    <td className="space-y-2 py-3">
                      {order.productMeta?.photoSafetyReviewRequired ? (
                        <span className="block text-amber-200">Manual photo safety review</span>
                      ) : null}
                      {order.status === "review" ? (
                        <button
                          className="block rounded-full bg-pumpkin px-3 py-1 text-ink disabled:opacity-40"
                          onClick={() => act(order.id, "approve")}
                          data-testid="approve-order"
                          disabled={order.portraitProgress ? !order.portraitProgress.complete : false}
                          title={
                            order.portraitProgress && !order.portraitProgress.complete
                              ? "All tier portraits must be generated before approval"
                              : undefined
                          }
                        >
                          Approve
                        </button>
                      ) : null}
                      {order.portraitProgress && !order.portraitProgress.complete ? (
                        <button
                          className="block text-amber-200"
                          type="button"
                          onClick={() => act(order.id, "regenerate_missing")}
                          data-testid="regenerate-missing-portraits"
                        >
                          Regenerate missing
                        </button>
                      ) : null}
                      <select className="field" value={styleId[order.id] || order.styleIds[0] || ""} onChange={(event) => setStyleId({ ...styleId, [order.id]: event.target.value })}>
                        {order.styleIds.map((id) => <option key={id} value={id}>{id}</option>)}
                      </select>
                      <select
                        className="field"
                        value={variantIndex[order.id] ?? order.portraitJobs?.[0]?.variantIndex ?? 0}
                        onChange={(event) => setVariantIndex({ ...variantIndex, [order.id]: Number(event.target.value) })}
                        data-testid="admin-regenerate-variant"
                      >
                        {(order.portraitJobs ?? [])
                          .filter((job) => job.styleId === (styleId[order.id] || order.styleIds[0]))
                          .sort((a, b) => a.variantIndex - b.variantIndex)
                          .map((job) => (
                            <option key={`${job.styleId}-${job.variantIndex}`} value={job.variantIndex}>
                              Variant {job.variantIndex + 1}
                            </option>
                          ))}
                      </select>
                      <button
                        className="block"
                        type="button"
                        onClick={() =>
                          act(
                            order.id,
                            "regenerate_variant",
                            styleId[order.id] || order.styleIds[0],
                            variantIndex[order.id] ??
                              order.portraitJobs?.find(
                                (job) => job.styleId === (styleId[order.id] || order.styleIds[0]),
                              )?.variantIndex ??
                              0,
                          )
                        }
                        data-testid="regenerate-one-portrait"
                      >
                        Regenerate one image
                      </button>
                      {(order.pendingReplacements ?? []).some(
                        (row) =>
                          row.styleId === (styleId[order.id] || order.styleIds[0]) &&
                          row.variantIndex ===
                            (variantIndex[order.id] ??
                              order.portraitJobs?.find(
                                (job) => job.styleId === (styleId[order.id] || order.styleIds[0]),
                              )?.variantIndex),
                      ) ? (
                        <button
                          className="block text-amber-200"
                          type="button"
                          onClick={() =>
                            act(
                              order.id,
                              "approve_replacement",
                              styleId[order.id] || order.styleIds[0],
                              variantIndex[order.id] ??
                                order.portraitJobs?.find(
                                  (job) => job.styleId === (styleId[order.id] || order.styleIds[0]),
                                )?.variantIndex ??
                                0,
                            )
                          }
                          data-testid="approve-portrait-replacement"
                        >
                          Approve replacement
                        </button>
                      ) : null}
                      <button className="block" type="button" onClick={() => act(order.id, "regenerate", styleId[order.id] || order.styleIds[0])}>Regenerate style</button>
                      <button className="block" type="button" onClick={() => act(order.id, "resend")}>Resend email</button>
                      {order.productMeta?.personalised && !order.partnerFulfillment?.externalOrderId ? (
                        <button className="block" type="button" onClick={() => act(order.id, "resubmit_partner")}>Resubmit Prodigi/Printful</button>
                      ) : null}
                      <button className="block" type="button" onClick={() => act(order.id, "refund")}>Refund</button>
                      {order.status === "delivered" ? <a className="block" href={`/results/${order.resultsToken}`}>Gallery</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredShopOrders.length ? (
            <div className="mt-8 overflow-x-auto" data-testid="admin-shop-orders-table">
              <h2 className="mb-2 text-2xl">Shop / catalogue orders</h2>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-cream/60"><tr>{showStoreColumn ? <th>Store</th> : null}<th>When</th><th>Email</th><th>Status</th><th>Lines</th><th>Paid</th><th></th></tr></thead>
                <tbody>
                  {filteredShopOrders.map((order) => (
                    <tr key={order.id} className="border-t border-line align-top">
                      {showStoreColumn ? <td className="py-2">{storeLabel(order.storeId)}</td> : null}
                      <td className="py-2">{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                      <td>{order.email}</td>
                      <td>
                        {order.status}
                        {order.fulfillmentError ? <span className="block text-red-300">{order.fulfillmentError}</span> : null}
                        {order.supplierCancelRequestedAt ? (
                          <span
                            className="mt-1 inline-block rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-950"
                          >
                            Supplier cancel requested
                          </span>
                        ) : null}
                        {order.trackingNumber ? <span className="block text-cream/60">Track: {order.trackingNumber}</span> : null}
                      </td>
                      <td>{order.lines.map((l) => `${l.name}×${l.quantity}`).join(", ")}</td>
                      <td>{formatGbp(order.amountPence)}{(order.amountRefundedPence ?? 0) > 0 ? <span className="block text-cream/60">Refunded {formatGbp(order.amountRefundedPence ?? 0)}</span> : null}</td>
                      <td className="py-2">
                        <AdminShopOrderPanel
                          order={order}
                          onError={(message) => setError(message)}
                          onUpdated={() => load()}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
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
        <section className="mt-6 space-y-6" data-testid="admin-products-panel">
          <p className="text-sm text-cream/70">Edit catalogue price, stock, and visibility. Export paid Go Dropship orders when a single catalogue store is selected.</p>
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
          {catalogueStores.map((storeId) => (
            <div key={storeId}>
              <h2 className="text-2xl">{storeLabel(storeId)}</h2>
              <table className="mt-2 w-full text-left text-sm">
                <thead className="text-cream/60"><tr><th>Product</th><th>Price</th><th>Stock</th><th>Active</th><th></th></tr></thead>
                <tbody>
                  {(catalogueByStore[storeId] ?? []).map((product) => (
                    <tr key={product.id} className="border-t border-line">
                      <td className="py-2">{product.name}</td>
                      <td>
                        <input
                          className="field w-24"
                          type="number"
                          value={Math.round(product.pricePence / 100)}
                          onChange={(e) => {
                            const pence = Math.round(Number(e.target.value) * 100);
                            setCatalogueByStore((prev) => ({
                              ...prev,
                              [storeId]: (prev[storeId] ?? []).map((p) => (p.id === product.id ? { ...p, pricePence: pence } : p)),
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="field w-20"
                          type="number"
                          value={product.stock}
                          onChange={(e) => {
                            const stock = Number(e.target.value);
                            setCatalogueByStore((prev) => ({
                              ...prev,
                              [storeId]: (prev[storeId] ?? []).map((p) => (p.id === product.id ? { ...p, stock } : p)),
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={product.active}
                          onChange={(e) => {
                            setCatalogueByStore((prev) => ({
                              ...prev,
                              [storeId]: (prev[storeId] ?? []).map((p) => (p.id === product.id ? { ...p, active: e.target.checked } : p)),
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="rounded-full border border-line px-3 py-1"
                          onClick={() =>
                            void saveProduct(storeId, product.id, {
                              pricePence: product.pricePence,
                              stock: product.stock,
                              active: product.active,
                            })
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "stores" ? (
        <section className="mt-6 space-y-6" data-testid="admin-stores-panel">
          <p className="text-sm text-cream/70">Domains (comma-separated), branding, and pause flags per store.</p>
          {stores.map((store) => {
            const edit = storeEdits[store.id];
            if (!edit) return null;
            return (
              <article key={store.id} className="rounded-3xl border border-line p-4">
                <h2 className="text-xl">{store.config.brand.appName}</h2>
                <label className="mt-3 block text-sm">Domains
                  <input
                    className="field mt-1 w-full"
                    value={edit.domains}
                    onChange={(e) => setStoreEdits({ ...storeEdits, [store.id]: { ...edit, domains: e.target.value } })}
                  />
                </label>
                <label className="mt-3 block text-sm">Tagline
                  <input className="field mt-1 w-full" value={edit.tagline} onChange={(e) => setStoreEdits({ ...storeEdits, [store.id]: { ...edit, tagline: e.target.value } })} />
                </label>
                <label className="mt-3 block text-sm">Support email
                  <input className="field mt-1 w-full" value={edit.supportEmail} onChange={(e) => setStoreEdits({ ...storeEdits, [store.id]: { ...edit, supportEmail: e.target.value } })} />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.salesPaused} onChange={(e) => setStoreEdits({ ...storeEdits, [store.id]: { ...edit, salesPaused: e.target.checked } })} /> Sales paused</label>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.queueHalted} onChange={(e) => setStoreEdits({ ...storeEdits, [store.id]: { ...edit, queueHalted: e.target.checked } })} /> Halt generation queue</label>
                <button type="button" className="mt-4 rounded-full bg-pumpkin px-4 py-2 text-ink" onClick={() => void saveStoreRow(store.id)}>Save {store.config.brand.appName}</button>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
