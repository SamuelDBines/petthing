import { getSql } from "@/lib/db/client";
import type { AdminLoginEvent } from "@/lib/admin/audit";
import { hashIp } from "@/lib/runtime";

export const adminAuditDbMethods = {
  async recordAdminLogin(email: string, ip: string) {
    const stored = ip === "unknown" || ip === "local" ? ip : hashIp(ip);
    await getSql()`
      insert into admin_login_events (email, ip)
      values (${email}, ${stored})
    `;
  },
  async listAdminLoginEvents(limit = 20): Promise<AdminLoginEvent[]> {
    const rows = await getSql()<
      { id: string; email: string; ip: string; created_at: Date }[]
    >`
      select id, email, ip, created_at
      from admin_login_events
      order by created_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      ip: row.ip,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  },
};
