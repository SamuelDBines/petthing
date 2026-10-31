"use client";

import { useEffect, useState } from "react";

type Row = { id: string; label: string; status: string; detail?: string };
type CronRow = { id: string; path: string; schedule: string; description: string; auth: string };

export function AdminHealthPanel() {
  const [integrations, setIntegrations] = useState<Row[]>([]);
  const [crons, setCrons] = useState<CronRow[]>([]);
  const [missing, setMissing] = useState<{ scope: string; key: string; description: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data.integrations ?? []);
        setCrons(data.crons ?? []);
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
                {row.detail ? `. ${row.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-medium text-cream">Scheduled jobs</h2>
        <p className="mt-1 text-sm text-muted">Bearer auth via CRON_SECRET. Kubernetes: k8s/cronjob/app-operations.yaml</p>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {crons.map((job) => (
            <li key={job.id} className="px-4 py-3 text-sm">
              <p className="text-cream">{job.id}</p>
              <p className="text-muted">{job.schedule} · {job.path}</p>
              <p className="text-muted">{job.description} · auth {job.auth}</p>
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
                <strong className="text-cream">{m.key}</strong> ({m.scope}). {m.description}
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
