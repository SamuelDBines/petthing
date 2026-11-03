# Kubernetes deploy overlay

## Safe deploy order

1. **Run migrations** — apply `migrate-job.yaml` (or `kubectl apply` the Job) and wait for `Complete` before rolling the web Deployment.
2. **Roll the app** — `web-deployment.yaml` uses a rolling update (`maxUnavailable: 0`, `maxSurge: 1`) so the previous pod keeps serving until the new one is ready.
3. **Crons** — `../cronjob/app-operations.yaml` (shop-only HTTP triggers; core crons live in the main platform overlay).

The web Deployment does **not** run migrations in an init container. A failed migration must not block pod scheduling and take the site offline.

## Probes

Readiness and liveness hit `GET /api/health` on port 3000. Tune `initialDelaySeconds` if cold starts are slow.

## Secrets

- `app-database` — `DATABASE_URL`, `DATABASE_URL_DIRECT`, `DATABASE_CA_CERT`
- `app-env` — remaining Next.js env (Stripe, Resend, etc.)

Replace image `ghcr.io/example/pawtraitry:latest` in manifests with your registry tag.
