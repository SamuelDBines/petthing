import { localDataPath } from "@/lib/localPaths";

const memory = new Set<string>();

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function postgresEmailSuppressionsEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function isEmailSuppressed(email: string) {
  const key = normalize(email);
  if (memory.has(key)) return true;
  if (!postgresEmailSuppressionsEnabled()) return false;
  const { getSql } = await import("@/lib/db/client");
  const rows = await getSql()`select 1 from email_suppressions where email = ${key} limit 1`;
  return rows.length > 0;
}

export async function suppressEmail(email: string, reason: string, detail?: string) {
  const key = normalize(email);
  memory.add(key);
  if (!postgresEmailSuppressionsEnabled()) {
    const { mkdir, appendFile } = await import("fs/promises");
    const dir = localDataPath("email-suppressions");
    await mkdir(dir, { recursive: true });
    await appendFile(`${dir}/log.txt`, `${new Date().toISOString()}\t${key}\t${reason}\t${detail ?? ""}\n`);
    return;
  }
  const { getSql } = await import("@/lib/db/client");
  await getSql()`
    insert into email_suppressions (email, reason, detail)
    values (${key}, ${reason}, ${detail ?? null})
    on conflict (email) do update set reason = excluded.reason, detail = excluded.detail, suppressed_at = now()
  `;
}

export function __clearSuppressionMemoryForTests() {
  memory.clear();
}
