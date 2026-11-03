#!/usr/bin/env bash
# Restore Postgres from a gzipped pg_dump object in DO Spaces (or any S3-compatible bucket).
#
# Required env:
#   DATABASE_URL          — target database (e.g. postgresql://user:pass@host:5432/db)
#   S3_ENDPOINT           — e.g. https://lon1.digitaloceanspaces.com
#   S3_BUCKET
#   S3_ACCESS_KEY_ID
#   S3_SECRET_ACCESS_KEY
#   BACKUP_KEY            — object key under the bucket (e.g. pg-backups/backup-20261026T020000Z.sql.gz)
#
# Usage:
#   BACKUP_KEY=pg-backups/backup-....sql.gz ./scripts/ops/restore-pg-from-spaces.sh

set -euo pipefail

: "${DATABASE_URL:?}"
: "${S3_ENDPOINT:?}"
: "${S3_BUCKET:?}"
: "${S3_ACCESS_KEY_ID:?}"
: "${S3_SECRET_ACCESS_KEY:?}"
: "${BACKUP_KEY:?}"

TMP="$(mktemp -t pg-restore.XXXXXX.sql.gz)"
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

aws --endpoint-url "$S3_ENDPOINT" s3 cp "s3://${S3_BUCKET}/${BACKUP_KEY}" "$TMP"
gunzip -c "$TMP" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
rm -f "$TMP"
echo "Restore complete from s3://${S3_BUCKET}/${BACKUP_KEY}"
