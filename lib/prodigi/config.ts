import { prodigiApiKeyForStore } from "@/lib/go-live/live-stores";

/** @deprecated use prodigiApiKeyForStore(storeId) */
export function prodigiApiKey(storeId?: string) {
  if (storeId) return prodigiApiKeyForStore(storeId);
  return process.env.PRODIGI_SANDBOX_API_KEY?.trim() || process.env.PRODIGI_API_KEY?.trim() || "";
}

export { prodigiApiKeyForStore, prodigiUsesLiveApi } from "@/lib/go-live/live-stores";
