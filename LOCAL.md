# Running Pawtraitry locally (Sam)

One-command stack for Apple Silicon Mac (or Linux): Postgres, Mailpit, the FastAPI content worker (dry-run), and optional Stripe webhook forwarding. The Next.js storefront and admin run on your machine on port 3000.

## Prerequisites

- Docker Desktop (or Colima) with `docker compose`
- Node.js 20+ (`node -v`)
- Stripe CLI is optional; `make dev` starts the official `stripe/stripe-cli` container when `STRIPE_SECRET_KEY` is set in `.env.local`

## First-time setup

```bash
git checkout cursor/local-integration-566f   # or your integration branch
cp .env.local.example .env.local
npm install
make dev
```

`make dev` starts Docker services, runs DB migrations + seed data, then `npm run dev`.

### URLs

| What | URL |
| --- | --- |
| Storefront | http://localhost:3000 |
| Create flow | http://localhost:3000/create |
| Admin | http://localhost:3000/admin |
| Content approval queue | http://localhost:8080/admin?token=dev-change-me |
| Mailpit (SMTP UI) | http://localhost:8025 |

**Admin login:** password in `.env.local` → `ADMIN_PASSWORD` (default in the example file: `portrait-dev`).

## Stripe TEST mode

1. In [Stripe Dashboard → Developers → API keys (Test mode)](https://dashboard.stripe.com/test/apikeys), copy the **Secret key** (`sk_test_…` or restricted `rk_test_…`).
2. Paste into `.env.local` as `STRIPE_SECRET_KEY`. **Never use `sk_live_` locally** — the app refuses live secret keys.
3. Start webhook forwarding (from repo root, with `.env.local` loaded):

   ```bash
   export $(grep -v '^#' .env.local | xargs)
   docker compose --profile stripe up stripe-listener
   ```

   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` in `.env.local`, then restart `npm run dev`.

4. Test card: `4242 4242 4242 4242`, any future expiry, any CVC, UK postcode.

Declined card for QA: `4000 0000 0000 0002`.

## Mock mode (no fal / Prodigi / Resend)

Leave `FAL_KEY`, `PRODIGI_API_KEY`, and `RESEND_API_KEY` empty:

- Portraits use coloured **placeholder** images (`lib/placeholderImage.ts`).
- Prodigi puzzle orders get a fake id `mock_prodigi_*` (logged to the terminal).
- Emails are written under `.data/outbox/` and logged as `[email] …`.

With sandbox keys set, the same code paths call the real fal, Prodigi sandbox, and Resend APIs.

## Content worker

Runs in Docker on port **8080** with `CONTENT_WORKER_DRY_RUN=true` (no social posting). Open the approval queue with the token matching `CONTENT_WORKER_SECRET` in `.env.local`.

Trigger a dry-run clip on disk:

```bash
cd content-worker && python3 scripts/dry_run.py
```

## End-to-end tests

```bash
make deps && make db-setup
npm run test:e2e          # mock checkout (no Stripe keys required)
npm run test:e2e:stripe   # full Stripe Checkout when sk_test_ + whsec_ are set
```

Screenshots land in `artifacts/screenshots/`.

## Going live later (not in this PR)

1. Register domain and set `NEXT_PUBLIC_APP_URL` to production HTTPS.
2. DigitalOcean (or other) Postgres: set `DATABASE_URL`, `DATABASE_URL_DIRECT`, `DATABASE_CA_CERT`.
3. Stripe **live** restricted key + live webhook endpoint (deploy first).
4. `FAL_KEY`, verified Resend domain, `PRODIGI_ENV=live` after sandbox QA.
5. Deploy Next.js (e.g. Vercel) and run migrations against production DB.
6. Content worker: `CONTENT_WORKER_DRY_RUN=false` on a separate host with publisher credentials.

Do not commit `.env.local` or any live secrets.
