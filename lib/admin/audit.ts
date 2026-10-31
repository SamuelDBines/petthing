import { getStore } from "@/lib/store";

export type AdminLoginEvent = {
  id: string;
  email: string;
  ip: string;
  createdAt: string;
};

export async function recordAdminLogin(email: string, ip: string) {
  try {
    const store = getStore();
    if (store.recordAdminLogin) await store.recordAdminLogin(email, ip);
  } catch {
    // Audit table may not exist until migration 0009 is applied.
  }
}

export async function listRecentAdminLogins(limit = 20): Promise<AdminLoginEvent[]> {
  const store = getStore();
  if (store.listAdminLoginEvents) return store.listAdminLoginEvents(limit);
  return [];
}
