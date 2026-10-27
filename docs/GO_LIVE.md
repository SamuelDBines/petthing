# Go live checklist

Sam supplies production keys; automation handles fulfilment, email, and cron once env is complete.

## One-step validation

```bash
npm run validate:go-live
```

Opens **Admin → Integration health** (`/admin/health`) after deploy for a live dashboard.

## Required environment (summary)

| Area | Variables |
|------|-----------|
| Core | `DATABASE_URL`, `CRON_SECRET`, `ADMIN_SESSION_SECRET`, `FILE_SIGNING_SECRET`, `IP_HASH_SALT` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (live keys for production) |
| Pawtraitry AI | `FAL_KEY` |
| Print partners | `PRODIGI_API_KEY`, `PRINTFUL_API_KEY` (Jinglefold stocking), `PRODIGI_ENV=live` when ready |
| Email (SES) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION` (default `eu-west-2`), `EMAIL_FROM`, `ADMIN_EMAIL`, optional `EMAIL_REPLY_TO`, `SES_CONFIGURATION_SET` |
| Google admin | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (or `ADMIN_PASSWORD_LOGIN` for dev only) |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or local blobs in dev) |
| Go Dropship | `GODROPSHIP_ORDERS_EMAIL` — **no supplier API**; cron emails CSV batches |
| ArtInBulk | `ARTINBULK_ORDERS_EMAIL` — hand-painted email hand-off |
| Content worker | `CONTENT_WORKER_SECRET`, `CONTENT_WORKER_DATABASE_URL`, platform keys (optional; publishers no-op without keys) |

Per-store domains and Stripe branding are configured in the admin **Stores** tab and `config/brand` seeds.

## Automation (cron)

Schedule these with Vercel crons (`vercel.json`) or Kubernetes manifests under `k8s/cronjob/`.

For Kubernetes, create ConfigMap `app-cron-config` with `APP_BASE_URL` and Secret `app-cron` with key `CRON_SECRET`. Shop-only crons are in `k8s/cronjob/app-operations.yaml` (generate/cleanup/partner jobs stay in the main overlay).

| Job | Path | Purpose |
|-----|------|---------|
| Generate | `/api/cron/generate` | Portrait queue |
| Cleanup | `/api/cron/cleanup` | Retention |
| Shop fulfilment | `/api/cron/shop-fulfillment` | Auto Go Dropship CSV + supplier email |
| Order watchdog | `/api/cron/order-watchdog` | Partner sync/retry, stuck alerts, print sync, auto-delivered |
| Partner sync | `/api/cron/partner-fulfillment` | Prodigi/Printful tracking (Jinglefold) |
| Abandoned basket | `/api/cron/abandoned-basket` | PECR opt-in reminders only |
| Admin digest | `/api/cron/admin-digest` | Daily ops email |

All crons: `Authorization: Bearer $CRON_SECRET` (GET or POST). Idempotent.

## Human approval only

- Portrait **manual review** (if `MANUAL_REVIEW=true`) before generation ships.
- **Content worker** queue approve before social posts publish.
- **Spend** above daily generation cap halts queue (admin re-enable).

## Migrations

```bash
npm run migrate
npm run migrate:content
npm run seed
```

Apply migrations through the latest in `db/migrations/` (includes wildframe → fixmonger merge, SES bounce suppressions in `0017_email_suppressions.sql`).

Configure **SES** domain identity for `EMAIL_FROM`, SNS bounce/complaint topics → HTTPS `https://<canonical-host>/api/webhooks/ses`.

On Kubernetes, run `k8s/deploy/migrate-job.yaml` to completion before rolling `k8s/deploy/web-deployment.yaml`.

## Stripe webhooks

Point live webhook to `https://<canonical-host>/api/webhooks/stripe` with events for checkout, disputes, and subscriptions.

## What is not automatable

- **Go Dropship** has no documented order API in this integration — orders are CSV + email.
- **ArtInBulk** is email-based quoting; tracking is entered in admin.
- **Carrier tracking** for catalogue shop requires supplier updates or manual `PATCH` on shop orders.
