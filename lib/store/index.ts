import { postgresStore } from "@/lib/db/postgres";
import { jsonStore } from "@/lib/store/json";
import { supabaseStore } from "@/lib/store/supabase";

export type Store = typeof jsonStore;

export function usingSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStore(): Store {
  if (process.env.DATABASE_URL) return postgresStore;
  if (usingSupabase()) return supabaseStore;
  if (process.env.VERCEL) throw new Error("Set DATABASE_URL before deploying");
  return jsonStore;
}
