import { adminStoreFilter } from "@/lib/admin/storeScope";
import { isAdmin } from "@/lib/adminAuth";
import { filterPeople, loadCrmDataset } from "@/lib/crm/admin-data";
import { personKeyFromEmail } from "@/lib/crm/merge-persons";
import { jsonError } from "@/lib/http";
import { adminAuditDbMethods } from "@/lib/db/admin-audit-methods";
import { hashIpForDisplay } from "@/lib/crm/merge-persons";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const storeFilter = (url.searchParams.get("store") as string | null) || (await adminStoreFilter());
  const includeExcluded = url.searchParams.get("includeExcluded") === "1";
  const { people, sparkline } = await loadCrmDataset(storeFilter === "all" ? "all" : storeFilter, includeExcluded);
  const filtered = filterPeople(people, {
    q: url.searchParams.get("q") ?? undefined,
    store: url.searchParams.get("storeFilter") ?? storeFilter,
    status: url.searchParams.get("status") ?? undefined,
    consent: url.searchParams.get("consent") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const sort = url.searchParams.get("sort") ?? "firstSeenAt";
  const dir = url.searchParams.get("dir") === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    const av = (a as Record<string, unknown>)[sort];
    const bv = (b as Record<string, unknown>)[sort];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });
  const adminLogins = (await adminAuditDbMethods.listAdminLoginEvents(50)).map((row) => ({
    ...row,
    ipHash: hashIpForDisplay(row.ip),
  }));
  return Response.json({
    storeId: storeFilter,
    includeExcluded,
    sparkline,
    people: filtered.map((person) => ({ ...person, personKey: personKeyFromEmail(person.email) })),
    adminLogins,
  });
}
