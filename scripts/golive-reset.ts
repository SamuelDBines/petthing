#!/usr/bin/env tsx
import { spawnSync } from "child_process";
import { goliveResetCounts, executeGoliveReset, resolveStoreScope, GoliveResetBlockedError } from "@/lib/golive/reset";

function parseArgs(argv: string[]) {
  let store = "";
  let dryRun = true;
  let confirm = false;
  let skipDump = false;
  for (const arg of argv) {
    if (arg.startsWith("--store=")) store = arg.slice("--store=".length);
    if (arg === "--dry-run") dryRun = true;
    if (arg === "--skip-dump") skipDump = true;
    if (arg === "--confirm") {
      confirm = true;
      dryRun = false;
    }
  }
  return { store, dryRun, confirm, skipDump };
}

function pgDumpAvailable() {
  const probe = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
}

async function main() {
  const { store, dryRun, confirm, skipDump } = parseArgs(process.argv.slice(2));
  if (!store) {
    console.error("Missing --store=<id> (e.g. --store=pawtraitry).");
    process.exit(1);
  }
  const storeIds = resolveStoreScope(store);
  const counts = await goliveResetCounts(storeIds);
  console.log(`Go-live reset scope: ${store} (${storeIds.join(", ")})`);
  console.log(JSON.stringify(counts, null, 2));
  if (dryRun || !confirm) {
    console.log("Dry run only. Re-run with --confirm after reviewing counts.");
    return;
  }
  if (!skipDump) {
    if (!pgDumpAvailable()) {
      console.error(
        "pg_dump is not available in this environment. Take a database backup first, then re-run with --skip-dump.",
      );
      process.exit(1);
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dump = spawnSync("pg_dump", [process.env.DATABASE_URL!], { encoding: "buffer" });
    if (dump.status !== 0) {
      console.error("pg_dump failed:", dump.stderr?.toString());
      process.exit(1);
    }
    const { writeFileSync } = await import("fs");
    writeFileSync(`golive-backup-${stamp}.sql`, dump.stdout);
    console.log(`Backup written: golive-backup-${stamp}.sql`);
  } else {
    console.log("Skipping pg_dump (--skip-dump). Ensure you have a backup.");
  }
  try {
    await executeGoliveReset(storeIds);
    console.log("Reset complete.");
  } catch (error) {
    if (error instanceof GoliveResetBlockedError) {
      console.error(error.message);
      process.exit(2);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
