import { getStore } from "@/lib/store";
import { listEmailSignups as listPgEmailSignups, listSuppressedEmails } from "@/lib/db/crm-methods";
import { mergePersonDetail, mergePersons, signupSparkline } from "@/lib/crm/merge-persons";
import type { PersonRow } from "@/lib/crm/types";

export async function loadCrmDataset(storeFilter: string | "all", includeExcluded = false) {
  const store = getStore();
  const storeId = storeFilter === "all" ? "all" : storeFilter;
  const [orders, shopOrders, preorders, signupsRaw, suppressed] = await Promise.all([
    store.listOrders(storeId),
    store.listShopOrders?.(storeId) ?? Promise.resolve([]),
    store.listPreorders?.(storeId) ?? Promise.resolve([]),
    "listEmailSignups" in store && typeof store.listEmailSignups === "function"
      ? (store as { listEmailSignups: (id?: string | "all") => Promise<unknown[]> }).listEmailSignups(storeId)
      : listPgEmailSignups(storeId),
    listSuppressedEmails(),
  ]);
  const signups = signupsRaw as import("@/lib/crm/merge-persons").EmailSignupRow[];
  const mergeArgs = { orders, shopOrders, preorders, signups, suppressed, includeExcluded };
  return {
    people: mergePersons(mergeArgs),
    sparkline: signupSparkline(signups, includeExcluded),
    mergeArgs,
  };
}

export async function loadPersonDetail(email: string, storeFilter: string | "all", includeExcluded = false) {
  const { mergeArgs } = await loadCrmDataset(storeFilter, includeExcluded);
  return mergePersonDetail(email, mergeArgs);
}

export function filterPeople(
  people: PersonRow[],
  args: {
    q?: string;
    store?: string;
    status?: string;
    consent?: string;
    from?: string;
    to?: string;
  },
) {
  return people.filter((person) => {
    if (args.q && !person.email.includes(args.q.trim().toLowerCase())) return false;
    if (args.store && args.store !== "all" && !person.storeIds.includes(args.store)) return false;
    if (args.status && args.status !== "all" && person.status !== args.status) return false;
    if (args.consent === "yes" && !person.marketingConsent) return false;
    if (args.consent === "no" && person.marketingConsent) return false;
    if (args.from && person.firstSeenAt.slice(0, 10) < args.from) return false;
    if (args.to && person.firstSeenAt.slice(0, 10) > args.to) return false;
    return true;
  });
}
