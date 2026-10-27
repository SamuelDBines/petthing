export const CUSTOMER_MODERATION_RETRY =
  "We couldn't check that photo right now. Please try again in a few minutes, or continue if the problem persists.";

export const CUSTOMER_NSFW_MESSAGE =
  "That photo looks like it includes nudity or sexual content. Please upload a different one.";

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
  if (status === 402) return true;
  if (status === 403 && /TOP_UP|locked|out of credit|insufficient/i.test(detail)) return true;
  return false;
}

type FalIncident = { at: number; status: number; detail: string };

const incidents: FalIncident[] = [];
const MAX_INCIDENTS = 50;
const RECENT_MS = 24 * 60 * 60 * 1000;

export function recordFalProviderIncident(source: "nsfw" | "generation", status: number, detail: string) {
  console.error(`[fal:${source}] ${status} ${detail}`);
  incidents.push({ at: Date.now(), status, detail });
  while (incidents.length > MAX_INCIDENTS) incidents.shift();
}

export function recentFalHealthDetail() {
  const cutoff = Date.now() - RECENT_MS;
  const recent = incidents.filter((row) => row.at >= cutoff);
  const credit = recent.find((row) => isFalTopUpOrCreditLock(row.status, row.detail));
  if (credit) return "fal: account locked / out of credit";
  const provider = recent.find((row) => isFalProviderHttpStatus(row.status));
  if (provider) return `fal: provider error ${provider.status} (last 24h)`;
  return undefined;
}

export function __clearFalIncidentsForTests() {
  incidents.length = 0;
}

export function isFalProviderError(error: unknown) {
  return error instanceof FalProviderError;
}
