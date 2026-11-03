import { prodigiApiKeyForStore, prodigiUsesLiveApi, type StoreRuntimeOpts } from "@/lib/go-live/live-stores";

export type ProdigiRuntimeOpts = StoreRuntimeOpts;

/** @deprecated use prodigiApiKeyForStore(storeId, opts) */
export function prodigiApiKey(storeId?: string, opts?: ProdigiRuntimeOpts) {
  if (storeId) return prodigiApiKeyForStore(storeId, opts);
  return process.env.PRODIGI_SANDBOX_API_KEY?.trim() || process.env.PRODIGI_API_KEY?.trim() || "";
}

export { prodigiApiKeyForStore, prodigiUsesLiveApi } from "@/lib/go-live/live-stores";
