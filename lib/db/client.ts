import postgres, { type Sql } from "postgres";
import type { ConnectionOptions } from "tls";

function databaseHost(connectionString: string) {
  const parsed = new URL(connectionString.replace(/^postgres(ql)?:\/\//, "https://"));
  return parsed.hostname;
}

function sslOptions(host: string): ConnectionOptions {
  const raw = process.env.DATABASE_CA_CERT?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_CA_CERT is required when DATABASE_URL is set. Download the CA from the DigitalOcean cluster, or set DATABASE_CA_CERT=system for an Advanced Edition cluster.",
    );
  }
  const base = { rejectUnauthorized: true as const, servername: host };
  if (raw === "system") return base;
  const ca = raw.replace(/\\n/g, "\n");
  if (!ca.includes("BEGIN CERTIFICATE")) {
    throw new Error("DATABASE_CA_CERT must be a PEM certificate, or the word system.");
  }
  return { ...base, ca };
}

export function openDatabase(connectionString: string, max: number) {
  if (!connectionString) throw new Error("Missing a Postgres connection string");
  const host = databaseHost(connectionString);
  return postgres(connectionString, {
    ssl: sslOptions(host),
    prepare: false,
    fetch_types: false,
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "portrait-spell" },
    onnotice: () => undefined,
  });
}

let runtime: Sql | null = null;

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!runtime) runtime = openDatabase(process.env.DATABASE_URL, process.env.VERCEL ? 1 : 3);
  return runtime;
}
