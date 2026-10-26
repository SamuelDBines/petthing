#!/usr/bin/env bash
set -euo pipefail
host="${POSTGRES_HOST:-localhost}"
port="${POSTGRES_PORT:-5432}"
user="${POSTGRES_USER:-pawtraitry}"
for _ in $(seq 1 60); do
  if pg_isready -h "$host" -p "$port" -U "$user" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
echo "Postgres did not become ready on ${host}:${port}" >&2
exit 1
