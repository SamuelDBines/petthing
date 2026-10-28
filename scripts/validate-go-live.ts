import { validateGoLive, validateGoLiveWarnings, STORE_PROFILES, GLOBAL_REQUIREMENTS } from "../lib/go-live/requirements";

const result = validateGoLive();
const warnings = validateGoLiveWarnings();

console.log("Go-live validation\n====================\n");
if (result.ok) {
  console.log("OK — all required variables are set for configured stores.\n");
} else {
  console.log(`Missing ${result.missing.length} required variable(s):\n`);
  for (const row of result.missing) {
    console.log(`  [${row.scope}] ${row.key} — ${row.description}`);
  }
  console.log("");
}

if (warnings.length) {
  console.log(`Optional Meta ads warnings (${warnings.length}):\n`);
  for (const row of warnings) {
    console.log(`  [${row.scope}] ${row.message}`);
  }
  console.log("");
}

console.log("Store profiles:", STORE_PROFILES.map((s) => s.storeId).join(", "));
console.log("Global keys:", GLOBAL_REQUIREMENTS.map((r) => r.key).join(", "));

process.exit(result.ok ? 0 : 1);
