import { readFileSync } from "fs";
import { readFile } from "fs/promises";
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
    // Shell-exported variables are enough.
  }
}

async function main() {
  loadEnv();
  const url = process.env.CONTENT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.log("No DATABASE_URL — content worker will use SQLite.");
    return;
  }
  const sql = openDatabase(url, 1);
  try {
    const dir = path.join(process.cwd(), "content-worker", "migrations");
    const files = ["001_content_tables.sql", "002_store_id.sql"];
    for (const name of files) {
      const body = await readFile(path.join(dir, name), "utf8");
      await sql.unsafe(body);
    }
    console.log("applied content-worker migrations");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
