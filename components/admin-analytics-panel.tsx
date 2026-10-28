"use client";

import { useMemo, useState } from "react";
import type { AnalyticsDashboard } from "@/lib/analytics/types";
import { BOUNCE_RATE_TOOLTIP } from "@/lib/analytics/labels";

function formatDelta(delta: number | null) {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const pct = Math.round(delta * 100);
  if (pct === 0) return "0%";
  return `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`;
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function formatGbpPence(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function MetricCard({
  label,
  value,
  delta,
  tooltip,
}: {
  label: string;
  value: string;
  delta: number | null;
  tooltip?: string;
}) {
  return (
    <article className="rounded-3xl border border-line p-4" title={tooltip}>
      <p className="text-sm text-cream/60">{label}</p>
      <p className="text-2xl">{value}</p>
      <p className="mt-1 text-xs text-cream/50">{formatDelta(delta)} vs prior period</p>
    </article>
  );
}

function LineChart({ series }: { series: AnalyticsDashboard["series"] }) {
  const width = 640;
  const height = 180;
  const max = Math.max(1, ...series.map((row) => row.sessions));
  const points = series
    .map((row, index) => {
      const x = series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width;
      const y = height - (row.sessions / max) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Visitors and sessions over time">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-pumpkin" points={points} />
    </svg>
  );
}

function FunnelBars({ funnel }: { funnel: AnalyticsDashboard["funnel"] }) {
  const max = Math.max(1, ...funnel.map((row) => row.count));
  return (
    <div className="space-y-3">
      {funnel.map((row) => (
        <div key={row.step}>
          <div className="flex items-center justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-cream/60">
              {row.count}
              {row.conversionFromLanding != null ? ` · ${Math.round(row.conversionFromLanding * 100)}% of landing` : ""}
            </span>
          </div>
          <div className="mt-1 h-3 rounded-full bg-ink/40">
            <div className="h-3 rounded-full bg-pumpkin" style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} />
          </div>
          {row.dropOff > 0 ? (
            <p className="mt-1 text-xs text-cream/50">
              Drop-off {row.dropOff}
              {row.dropOffRate != null ? ` (${Math.round(row.dropOffRate * 100)}%)` : ""}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsPanel({
  analytics,
  onReload,
}: {
  analytics: AnalyticsDashboard;
  onReload: (query: URLSearchParams) => void;
}) {
  const [preset, setPreset] = useState(analytics.range.preset || "7d");
  const [includeExcluded, setIncludeExcluded] = useState(analytics.includeExcluded);
  const [customFrom, setCustomFrom] = useState(analytics.range.from);
  const [customTo, setCustomTo] = useState(analytics.range.to);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", preset);
    if (preset === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    if (includeExcluded) params.set("includeExcluded", "1");
    return params;
  }, [preset, customFrom, customTo, includeExcluded]);

  return (
    <section className="mt-6 space-y-6" data-testid="admin-analytics-panel">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Range
          <select className="field ml-2" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {preset === "custom" ? (
          <>
            <label className="text-sm">
              From
              <input className="field ml-2" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label className="text-sm">
              To
              <input className="field ml-2" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeExcluded} onChange={(e) => setIncludeExcluded(e.target.checked)} />
          Include internal/bot traffic
        </label>
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => onReload(query)}>
          Apply
        </button>
        <p className="text-sm text-cream/60">
          Active now: <span className="text-cream">{analytics.summary.activeNow}</span> (5 min)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <MetricCard label="Unique visitors" value={String(analytics.summary.uniqueVisitors.value)} delta={analytics.summary.uniqueVisitors.delta} />
        <MetricCard label="Sessions" value={String(analytics.summary.sessions.value)} delta={analytics.summary.sessions.delta} />
        <MetricCard
          label="Bounce rate"
          value={`${Math.round(analytics.summary.bounceRate.value * 100)}%`}
          delta={analytics.summary.bounceRate.delta}
          tooltip={BOUNCE_RATE_TOOLTIP}
        />
        <MetricCard label="New visitors" value={String(analytics.summary.newVisitors.value)} delta={analytics.summary.newVisitors.delta} />
        <MetricCard label="Returning visitors" value={String(analytics.summary.returningVisitors.value)} delta={analytics.summary.returningVisitors.delta} />
        <MetricCard label="Returning sessions" value={String(analytics.summary.returningSessions.value)} delta={analytics.summary.returningSessions.delta} />
        <MetricCard label="Avg session" value={formatDuration(analytics.summary.avgSessionDurationMs.value)} delta={analytics.summary.avgSessionDurationMs.delta} />
        <MetricCard label="Pages / session" value={String(analytics.summary.pagesPerSession.value)} delta={analytics.summary.pagesPerSession.delta} />
        <MetricCard label="Paid traffic sessions" value={String(analytics.summary.paidTrafficSessions.value)} delta={analytics.summary.paidTrafficSessions.delta} />
        <MetricCard label="Revenue" value={formatGbpPence(analytics.revenue.revenuePence)} delta={null} />
      </div>

      <div className="rounded-3xl border border-line p-4">
        <h2 className="text-2xl">Visitors & sessions</h2>
        <LineChart series={analytics.series} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">Funnel</h2>
          <FunnelBars funnel={analytics.funnel} />
        </div>
        <div>
          <h2 className="text-2xl">Why people leave</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {analytics.bounceReasons.length ? (
              analytics.bounceReasons.map((row) => (
                <li key={`${row.step}-${row.reason}`} className="rounded-2xl border border-line p-3">
                  <span className="font-medium">{row.step}</span> · {row.reason} · {row.count}{" "}
                  <span className="text-cream/60">({row.detail})</span>
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-line p-3 text-cream/60">No major drop-offs in this range.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">Traffic sources</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-cream/60">
              <tr>
                <th>Source</th>
                <th>Sessions</th>
                <th>Bounce</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topSources.map((row) => (
                <tr key={row.source} className="border-t border-line">
                  <td className="py-2">
                    {row.source}
                    {row.paid ? " · paid" : ""}
                  </td>
                  <td>{row.sessions}</td>
                  <td>{Math.round(row.bounceRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="text-2xl">Campaigns</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-cream/60">
              <tr>
                <th>Campaign</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.utmCampaigns.map((row) => (
                <tr key={row.campaign} className="border-t border-line">
                  <td className="py-2">{row.campaign}</td>
                  <td>{row.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <h2 className="text-2xl">Landing pages</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {analytics.topLandingPages.map((row) => (
              <li key={row.path} className="rounded-xl border border-line p-3">
                {row.path} · {row.sessions} sessions · {Math.round(row.bounceRate * 100)}% bounce
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl">Exit pages</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {analytics.topExitPages.map((row) => (
              <li key={row.path} className="rounded-xl border border-line p-3">
                {row.path} · {row.sessions}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl">Devices & browsers</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.devices.map((row) => (
              <li key={row.device}>
                {row.device}: {row.sessions}
              </li>
            ))}
            {analytics.browsers.map((row) => (
              <li key={row.browser}>
                {row.browser}: {row.sessions}
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-lg">Countries</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {analytics.countries.slice(0, 6).map((row) => (
              <li key={row.country}>
                {row.country}: {row.sessions}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-2xl">Revenue by source</h2>
        <p className="mt-1 text-sm text-cream/60">
          Orders {analytics.revenue.orders} · AOV {formatGbpPence(analytics.revenue.aovPence)}
          {analytics.revenue.conversionRate != null
            ? ` · Conversion ${Math.round(analytics.revenue.conversionRate * 100)}%`
            : ""}
        </p>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-cream/60">
            <tr>
              <th>Source</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>AOV</th>
            </tr>
          </thead>
          <tbody>
            {analytics.revenue.bySource.map((row) => (
              <tr key={row.source} className="border-t border-line">
                <td className="py-2">{row.source}</td>
                <td>{row.orders}</td>
                <td>{formatGbpPence(row.revenuePence)}</td>
                <td>{formatGbpPence(row.aovPence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analytics.byStore ? (
        <div data-testid="admin-analytics-by-store">
          <h2 className="text-2xl">By store</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {Object.entries(analytics.byStore).map(([storeId, dash]) => (
              <article key={storeId} className="rounded-2xl border border-line p-4">
                <h3 className="font-medium">{storeId}</h3>
                <p className="mt-2 text-sm">
                  Visitors {dash.summary.uniqueVisitors.value} · Sessions {dash.summary.sessions.value}
                </p>
                <p className="text-sm">Bounce {Math.round(dash.summary.bounceRate.value * 100)}%</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
