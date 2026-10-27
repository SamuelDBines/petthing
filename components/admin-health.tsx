"use client";

import { useEffect, useState } from "react";

type Row = { id: string; label: string; status: string; detail?: string };

export function AdminHealthPanel() {
  const [integrations, setIntegrations] = useState<Row[]>([]);
  const [missing, setMissing] = useState<{ scope: string; key: string; description: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data.integrations ?? []);
        setMissing(data.goLive?.missing ?? []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-lg font-medium text-cream">Connections</h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {integrations.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-cream">{row.label}</span>
              <span className="text-muted">
                {row.status}
                {row.detail ? ` — ${row.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {missing.length ? (
        <section>
          <h2 className="text-lg font-medium text-cream">Go-live gaps</h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
            {missing.map((m) => (
              <li key={`${m.scope}:${m.key}`}>
                <strong className="text-cream">{m.key}</strong> ({m.scope}) — {m.description}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">All required go-live environment variables are present.</p>
      )}
    </div>
  );
}
