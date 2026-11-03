"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatGbp } from "@/config/pricing";

type Person = {
  personKey: string;
  email: string;
  name: string | null;
  storeIds: string[];
  firstSeenAt: string;
  signupSources: string[];
  utmSource: string | null;
  utmCampaign: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  orderCount: number;
  totalSpentPence: number;
  lastOrderAt: string | null;
  status: string;
};

type CustomersPayload = {
  sparkline: { today: number; last7d: number; last30d: number; series: { day: string; count: number }[] };
  people: Person[];
  adminLogins: { email: string; ipHash: string; createdAt: string }[];
  includeExcluded: boolean;
};

function Sparkline({ series }: { series: { day: string; count: number }[] }) {
  const max = Math.max(1, ...series.map((row) => row.count));
  const points = series
    .map((row, index) => {
      const x = series.length <= 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 100 - (row.count / max) * 90;
      return `${x},${y}`;
    })
    .join(" ");
  return <svg viewBox="0 0 100 100" className="h-8 w-24" aria-hidden><polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} /></svg>;
}

function loginMethodLabel(email: string) {
  if (email === "password-login") return "Password";
  return "Google";
}

function loginIdentity(email: string) {
  if (email === "password-login") return "Admin password";
  return email;
}

export function AdminCustomersPanel({ adminStore }: { adminStore: string }) {
  const [subTab, setSubTab] = useState<"people" | "admin">("people");
  const [data, setData] = useState<CustomersPayload | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [consent, setConsent] = useState("all");
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [resetCounts, setResetCounts] = useState<Record<string, number> | null>(null);
  const loadSeq = useRef(0);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("store", adminStore);
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (consent !== "all") params.set("consent", consent);
    if (includeExcluded) params.set("includeExcluded", "1");
    return params;
  }, [adminStore, q, status, consent, includeExcluded]);

  useEffect(() => {
    const seq = ++loadSeq.current;
    const controller = new AbortController();
    setData(null);
    void (async () => {
      const response = await fetch(`/api/admin/customers?${query.toString()}`, { signal: controller.signal });
      if (seq !== loadSeq.current) return;
      if (!response.ok) return;
      setData(await response.json());
    })();
    return () => controller.abort();
  }, [query]);

  async function runResetDryRun() {
    const response = await fetch(`/api/admin/golive-reset?store=${adminStore}`);
    if (!response.ok) return;
    const body = await response.json();
    setResetCounts(body.counts ?? null);
  }

  if (!data) return <p className="mt-6 text-sm text-cream/60">Loading customers…</p>;

  return (
    <section className="mt-6 space-y-6" data-testid="admin-customers-panel">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`rounded-full px-4 py-2 text-sm ${subTab === "people" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setSubTab("people")}>
          Customers & sign-ups
        </button>
        <button type="button" className={`rounded-full px-4 py-2 text-sm ${subTab === "admin" ? "bg-pumpkin text-ink" : "border border-line"}`} onClick={() => setSubTab("admin")}>
          Admin logins
        </button>
      </div>

      {subTab === "people" ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-3xl border border-line p-4">
              <p className="text-sm text-cream/60">New sign-ups today</p>
              <p className="text-2xl">{data.sparkline.today}</p>
              <Sparkline series={data.sparkline.series.slice(-14)} />
            </article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">7 days</p><p className="text-2xl">{data.sparkline.last7d}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">30 days</p><p className="text-2xl">{data.sparkline.last30d}</p></article>
            <article className="rounded-3xl border border-line p-4"><p className="text-sm text-cream/60">People</p><p className="text-2xl">{data.people.length}</p></article>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">Search<input className="field ml-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="email" /></label>
            <label className="text-sm">Status<select className="field ml-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="subscriber">Subscriber</option>
              <option value="customer">Customer</option>
              <option value="repeat_customer">Repeat</option>
              <option value="abandoned_checkout">Abandoned checkout</option>
            </select></label>
            <label className="text-sm">Consent<select className="field ml-2" value={consent} onChange={(e) => setConsent(e.target.value)}>
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeExcluded} onChange={(e) => setIncludeExcluded(e.target.checked)} /> Include internal/bot</label>
            <a className="rounded-full border border-line px-4 py-2 text-sm" href={`/api/admin/customers/export?store=${adminStore}`}>Export consented CSV</a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-cream/60">
                <tr>
                  <th>Email</th><th>Name</th><th>Stores</th><th>First seen</th><th>Source</th><th>UTM</th><th>Consent</th><th>Orders</th><th>Spent</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((person) => (
                  <tr key={person.personKey} className="border-t border-line">
                    <td className="py-2"><Link className="underline" href={`/admin/customers/${encodeURIComponent(person.personKey)}`}>{person.email}</Link></td>
                    <td>{person.name ?? "n/a"}</td>
                    <td>{person.storeIds.join(", ")}</td>
                    <td>{person.firstSeenAt.slice(0, 10)}</td>
                    <td>{person.signupSources.join(", ")}</td>
                    <td>{person.utmSource ?? "n/a"}{person.utmCampaign ? ` / ${person.utmCampaign}` : ""}</td>
                    <td>{person.marketingConsent ? "Yes" : "No"}</td>
                    <td>{person.orderCount}</td>
                    <td>{formatGbp(person.totalSpentPence)}</td>
                    <td>{person.status.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-3xl border border-line p-4">
            <h2 className="text-xl">Reset test data</h2>
            <p className="mt-1 text-sm text-cream/60">Dry-run only in admin. Run <code className="text-xs">npm run golive:reset -- --store={adminStore} --confirm</code> on the server to delete.</p>
            <button type="button" className="mt-3 rounded-full border border-line px-4 py-2 text-sm" onClick={() => void runResetDryRun()} data-testid="admin-golive-reset-dry-run">
              Preview reset counts
            </button>
            {resetCounts ? (
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink/40 p-3 text-xs">{JSON.stringify(resetCounts, null, 2)}</pre>
            ) : null}
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line p-4">
          <h2 className="text-xl">Recent admin sign-ins</h2>
          <p className="mt-1 text-sm text-cream/60">Last 12 sign-ins (hashed IP only).</p>
          <table className="mt-4 w-full min-w-[480px] text-left text-sm">
            <thead className="text-cream/60">
              <tr>
                <th className="pb-2">Time</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Identity</th>
                <th className="pb-2">IP hash</th>
              </tr>
            </thead>
            <tbody>
              {data.adminLogins.map((row) => (
                <tr key={`${row.email}-${row.createdAt}`} className="border-t border-line">
                  <td className="py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString("en-GB")}</td>
                  <td className="py-2">{loginMethodLabel(row.email)}</td>
                  <td className="py-2">{loginIdentity(row.email)}</td>
                  <td className="py-2 font-mono text-xs">{row.ipHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
