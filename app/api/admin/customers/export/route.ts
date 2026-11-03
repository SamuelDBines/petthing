import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { filterPeople, loadCrmDataset } from "@/lib/crm/admin-data";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const storeFilter = (new URL(request.url).searchParams.get("store") as string | null) || (await adminStoreFilter());
  const includeExcluded = new URL(request.url).searchParams.get("includeExcluded") === "1";
  const { people } = await loadCrmDataset(storeFilter === "all" ? "all" : storeFilter, includeExcluded);
  const filtered = filterPeople(people, {
    q: new URL(request.url).searchParams.get("q") ?? undefined,
    store: storeFilter,
    consent: "yes",
  }).filter((person) => person.marketingConsent && !person.unsubscribed && !person.suppressed);
  const lines = ["email,stores,first_seen,source,utm_source,utm_campaign"];
  for (const person of filtered) {
    lines.push(
      [
        person.email,
        person.storeIds.join("|"),
        person.firstSeenAt.slice(0, 10),
        person.signupSources.join("|"),
        person.utmSource ?? "",
        person.utmCampaign ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consented-customers.csv"',
    },
  });
}
