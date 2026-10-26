import { readFileSync } from "fs";
import { applyMigrations } from "../lib/db/migrate";

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

async function main() {
  loadEnv();
  const direct = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!direct) throw new Error("Set DATABASE_URL_DIRECT (or DATABASE_URL) before migrating.");

  const { applied, skipped } = await applyMigrations(direct);
  for (const file of skipped) console.log(`skip ${file}`);
  for (const file of applied) console.log(`applied ${file}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
