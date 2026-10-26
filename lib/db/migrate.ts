import { readdir, readFile } from "fs/promises";
import path from "path";
import { openDatabase } from "@/lib/db/client";

export async function applyMigrations(
  connectionString: string,
  migrationsDir = path.join(process.cwd(), "db", "migrations"),
) {
  const sql = openDatabase(connectionString, 1);
  const applied: string[] = [];
  const skipped: string[] = [];
  try {
    await sql`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `;
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const rows = await sql<{ id: string }[]>`select id from schema_migrations where id = ${file}`;
      if (rows.length) {
        skipped.push(file);
        continue;
      }
      const body = await readFile(path.join(migrationsDir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into schema_migrations (id) values (${file})`;
      });
      applied.push(file);
    }
    return { applied, skipped };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
