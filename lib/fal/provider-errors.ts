export const CUSTOMER_MODERATION_RETRY =
  "We couldn't check that photo right now. Please try again in a few minutes, or continue if the problem persists.";

export const CUSTOMER_NSFW_MESSAGE =
  "That photo looks like it includes nudity or sexual content. Please upload a different one.";

import { isFalCreditExhaustedHttp } from "@/lib/fal/credit-exhaustion";

export class FalProviderError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`fal provider error ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

export function isFalProviderHttpStatus(status: number) {
  return status === 401 || status === 402 || status === 403 || status === 429 || status >= 500;
}

export function parseFalErrorDetail(text: string) {
  try {
    const body = JSON.parse(text) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((row) => row?.msg ?? "").filter(Boolean).join("; ");
    }
  } catch {
    // plain text
  }
  return text.slice(0, 500);
}

export function isFalTopUpOrCreditLock(status: number, detail: string) {
  return isFalCreditExhaustedHttp(status, detail);
}

type FalIncident = { at: number; status: number; detail: string };

const incidents: FalIncident[] = [];
const MAX_INCIDENTS = 50;
const RECENT_MS = 24 * 60 * 60 * 1000;

function detailFromIncidents(rows: FalIncident[]) {
  const credit = rows.find((row) => isFalTopUpOrCreditLock(row.status, row.detail));
  if (credit) return "fal: account locked / out of credit";
  const provider = rows.find((row) => isFalProviderHttpStatus(row.status));
  if (provider) return `fal: provider error ${provider.status} (last 24h)`;
  return undefined;
}

export function recordFalProviderIncident(source: "nsfw" | "generation", status: number, detail: string) {
  console.error(`[fal:${source}] ${status} ${detail}`);
  incidents.push({ at: Date.now(), status, detail });
  while (incidents.length > MAX_INCIDENTS) incidents.shift();
  void persistFalIncident(source, status, detail);
}

async function persistFalIncident(source: string, status: number, detail: string) {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    const { getSql } = await import("@/lib/db/client");
    await getSql()`
      insert into fal_provider_incidents (source, status, detail)
      values (${source}, ${status}, ${detail})
    `;
  } catch (error) {
    console.error("[fal] could not persist incident", error);
  }
}

export function recentFalHealthDetailFromMemory() {
  const cutoff = Date.now() - RECENT_MS;
  return detailFromIncidents(incidents.filter((row) => row.at >= cutoff));
}

export async function recentFalHealthDetail() {
  const fromMemory = recentFalHealthDetailFromMemory();
  if (fromMemory) return fromMemory;
  if (!process.env.DATABASE_URL?.trim()) return undefined;
  try {
    const { getSql } = await import("@/lib/db/client");
    const sql = getSql();
    const since = new Date(Date.now() - RECENT_MS).toISOString();
    const rows = await sql<{ status: number; detail: string | null; created_at: string }[]>`
      select status, detail, created_at::text
      from fal_provider_incidents
      where created_at >= ${since}::timestamptz
      order by created_at desc
      limit 50
    `;
    const mapped = rows.map((row) => ({
      at: new Date(row.created_at).getTime(),
      status: row.status,
      detail: row.detail ?? "",
    }));
    return detailFromIncidents(mapped);
  } catch {
    return undefined;
  }
}

export function __clearFalIncidentsForTests() {
  incidents.length = 0;
}

export function isFalProviderError(error: unknown) {
  return error instanceof FalProviderError;
}
