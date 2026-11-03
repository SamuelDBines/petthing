import { isAdmin } from "@/lib/adminAuth";
import { loadPersonDetail } from "@/lib/crm/admin-data";
import { emailFromPersonKey } from "@/lib/crm/merge-persons";
import { anonymizeEmailRecords, unsubscribeEmail } from "@/lib/db/crm-methods";
import { suppressEmail } from "@/lib/email/suppressions";
import { jsonError, parseBody } from "@/lib/http";
import { adminStoreFilter } from "@/lib/admin/storeScope";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["unsubscribe", "anonymize"]),
});

export async function GET(_request: Request, context: { params: Promise<{ personKey: string }> }) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const { personKey } = await context.params;
  const email = emailFromPersonKey(decodeURIComponent(personKey));
  const storeFilter = await adminStoreFilter();
  const detail = await loadPersonDetail(email, storeFilter === "all" ? "all" : storeFilter);
  if (!detail) return jsonError("Person not found", 404);
  return Response.json(detail);
}

export async function POST(request: Request, context: { params: Promise<{ personKey: string }> }) {
  if (!(await isAdmin())) return jsonError("Sign in required", 401);
  const parsed = parseBody(actionSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { personKey } = await context.params;
  const email = emailFromPersonKey(decodeURIComponent(personKey));
  if (parsed.data.action === "unsubscribe") {
    await unsubscribeEmail(email);
    await suppressEmail(email, "admin_unsubscribe", "Admin CRM unsubscribe");
    return Response.json({ ok: true });
  }
  await anonymizeEmailRecords(email);
  await suppressEmail(email, "admin_anonymize", "Admin CRM anonymize");
  return Response.json({ ok: true, anonymized: true });
}
