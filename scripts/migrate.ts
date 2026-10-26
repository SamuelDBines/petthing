import { readFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { openDatabase } from "../lib/db/client";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  } catch {
    // A shell that already exported the variables does not need .env.local.
  }
}

function statements(sqlText: string) {
  const stripped = sqlText
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return stripped
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  loadEnv();
  const direct = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!direct) throw new Error("Set DATABASE_URL_DIRECT (or DATABASE_URL) before migrating.");

  const sql = openDatabase(direct, 1);
  try {
    await sql`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `;
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const applied = await sql<{ id: string }[]>`select id from schema_migrations where id = ${file}`;
      if (applied.length) {
        console.log(`skip ${file}`);
        continue;
      }
      const body = await readFile(path.join(dir, file), "utf8");
      const steps = statements(body);
      await sql.begin(async (tx) => {
        for (const step of steps) await tx.unsafe(step);
        await tx`insert into schema_migrations (id) values (${file})`;
      });
      console.log(`applied ${file}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
