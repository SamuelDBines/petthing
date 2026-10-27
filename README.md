# Pawtraitry

Premium AI pet portraits from your customers’ photos — a UK gift brand operated as a trading name of Bishop Co Tech Limited. Brand name, domain, and support email are configured in `config/brand.ts` and overridden with `NEXT_PUBLIC_*` env vars (see `.env.example`).

Seasonal themes rotate by date (Christmas turns on **1 November** each year). Halloween may still be the active theme before that date in development.

The app runs locally with **no accounts**. Payments, image generation, email, and printing switch on when you add keys. Until then, checkout is a demo button, portraits are labelled placeholders, and emails are written to `.data/outbox`.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

Admin: open `/admin` on the **canonical admin URL** (`ADMIN_URL`, default `http://localhost:3000`). Production/staging uses **Sign in with Google** (see below). For local dev and Playwright, set `ADMIN_PASSWORD_LOGIN=true` and use `ADMIN_PASSWORD` (sample: `portrait-dev`).

- Landing: http://localhost:3000
- Create flow: http://localhost:3000/create
- Admin: http://localhost:3000/admin
- Legal: `/terms`, `/privacy`, `/refunds`, `/shipping`

On the create flow, leave Stripe empty. “Pay securely” marks the order paid and queues jobs. On the success page, **Paint the portraits now** runs the queue. With no `FAL_KEY`, each image is a coloured placeholder.

Checkout requires **two consents**: photo permission and UK digital-supply acknowledgement (immediate delivery, loss of 14-day cancel right for digital content).

`MANUAL_REVIEW` defaults to on. After painting, the order sits in admin until you approve it.

For a one-command local stack (Postgres, Mailpit, content worker, Stripe webhook forwarding), see **LOCAL.md**.

## Social content worker

The `content-worker/` FastAPI service plans daily 9:16 pet before/after shorts, queues posts for approval, and can publish to YouTube, Instagram, Pinterest, TikTok, and X when credentials are set. See `content-worker/README.md` for env vars, Docker, and dry-run (`python3 scripts/dry_run.py`).

## Go-live checklist (env vars)

Set every variable below in Vercel (or your host) before taking real money. Do **not** commit secrets.

### Brand & site

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Customer-facing name (default Pawtraitry) |
| `NEXT_PUBLIC_SITE_DOMAIN` | Canonical domain, e.g. `pawtraitry.co.uk` |
| `NEXT_PUBLIC_APP_URL` | Full public URL, e.g. `https://pawtraitry.co.uk` — **required** so fal, Prodigi, and email links work |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Shown on legal pages and in copy |
| `REFERRAL_CODE_PREFIX` | Optional; default `PAW` |

### Security & admin

| Variable | Purpose |
| --- | --- |
| `ADMIN_URL` | Canonical admin origin (staging: `https://dropship.store.bishop-co-tech.co.uk`). `/admin` on other store hosts redirects here. |
| `AUTH_URL` | Same as `ADMIN_URL` for Auth.js (OAuth callbacks). |
| `AUTH_SECRET` | Session encryption (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client (Web application) |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated allowlist (default `samuelbines@gmail.com`); requires `email_verified` |
| `ADMIN_PASSWORD_LOGIN` | `true` to enable legacy password login (local/E2E only; default `false`) |
| `ADMIN_PASSWORD` | Password when `ADMIN_PASSWORD_LOGIN=true` |
| `ADMIN_SESSION_SECRET` | Legacy password-session signing (local/E2E) |
| `ADMIN_COOKIE_DOMAIN` | Optional; share admin store filter cookie across subdomains (e.g. `.bishop-co-tech.co.uk`) |
| `CRON_SECRET` | Bearer token for `/api/cron/*` |
| `FILE_SIGNING_SECRET` | Signs local file URLs when not on object storage |
| `IP_HASH_SALT` | Hashes IPs for rate limits |
| `ADMIN_EMAIL` | Review queue, failures, spend cap, print alerts |
| `MANUAL_REVIEW` | `true` at launch recommended |
| `MAX_DAILY_GEN_SPEND_GBP` | Daily fal spend cap (default 25) |
| `USD_TO_GBP` | Converts fal USD list price for spend logging |

### Database (production)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (required on Vercel) |
| `DATABASE_URL_DIRECT` | Direct connection for `npm run migrate` only |
| `DATABASE_CA_CERT` | CA PEM or `system` |

Run `db/migrations/*.sql` (including `0003_digital_supply_consent.sql`) on your cluster. Supabase path: `supabase/migrations/`.

### Stripe (GBP)

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Restricted live key (`rk_`) after sandbox testing |
| `STRIPE_WEBHOOK_SECRET` | From endpoint `https://your-domain/api/webhooks/stripe` |

Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.

Demo checkout is **disabled** in production and whenever `STRIPE_SECRET_KEY` is set.

Do **not** enable Stripe Tax until you have an active VAT registration.

### fal.ai

| Variable | Purpose |
| --- | --- |
| `FAL_KEY` | Generation + NSFW checks |
| `FAL_MODEL_ID` | Default `fal-ai/flux-pro/kontext/multi` |
| `FAL_COST_USD_PER_IMAGE` | Spend accounting |

Reference photos must be **HTTPS URLs** your host can sign (not localhost).

### Resend

| Variable | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Amazon SES (default mail provider) |
| `AWS_SES_REGION` | SES region (default `eu-west-2`) |
| `EMAIL_FROM` | e.g. `Pawtraitry <hello@pawtraitry.co.uk>` after SES domain verification |
| `RESEND_API_KEY` | Optional if `EMAIL_PROVIDER=resend` |

### Prodigi (UK print)

| Variable | Purpose |
| --- | --- |
| `PRODIGI_API_KEY` | API key (sandbox or live) |
| `PRODIGI_ENV` | `sandbox` or `live` — switches API host in `lib/prodigi.ts` |
| `PRODIGI_SKU_PUZZLE` | Default `JIGSAW-PUZZLE-252` |

Puzzle orders need Stripe (shipping address), a public `NEXT_PUBLIC_APP_URL`, and `PRODIGI_ENV=live` for real fulfilment.

### Optional marketing

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta pixel (after cookie consent) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok pixel (after cookie consent) |

## What blocks a real order end-to-end

| Blocker | Symptom | Fix |
| --- | --- | --- |
| No `DATABASE_URL` on Vercel | App errors on write | Configure Postgres |
| No `STRIPE_*` | No card checkout in production | Live restricted key + webhook |
| No `FAL_KEY` | Placeholder images only | Add fal key; use public site URL for uploads |
| `NEXT_PUBLIC_APP_URL` still localhost | Prodigi/fal cannot fetch assets | Set to production HTTPS URL |
| `PRODIGI_ENV=sandbox` | Puzzles not in real production | Set `live` with live API key after QA |
| No SES / Resend keys | Emails only in `.data/outbox` | Verify SES domain, set `EMAIL_FROM` |
| Cron not running | Slow or stuck queue | Plan that allows `vercel.json` schedule or external cron hitting `/api/cron/generate` with `CRON_SECRET` |
| Domain not registered | DNS, email, Stripe branding | Register `pawtraitry.co.uk` / `.com` and point to host |

### Google admin sign-in (OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **OAuth consent screen** → **External** → **Testing** (add your Google accounts as test users until published).
2. **Credentials** → Create **OAuth client ID** → **Web application**.
3. **Authorised redirect URIs** (exact paths):
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Staging: `https://dropship.store.bishop-co-tech.co.uk/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `ADMIN_URL`, and `AUTH_URL` to the same canonical admin origin. Set `ADMIN_ALLOWED_EMAILS` to comma-separated Google accounts.
5. Run migration `0009_admin_login_audit.sql` so sign-ins are recorded.

Visiting `/admin` on a non-canonical store hostname redirects to `ADMIN_URL/admin`. OAuth only uses the canonical redirect URI above.

## Connect each service

### Postgres

Apply migrations under `db/migrations/`. The app uses Drizzle schema in `db/schema.ts`.

### Stripe

Webhook fulfillment marks orders paid and enqueues generation (not in the webhook). Promotion codes: `allow_promotion_codes` unless a referral code was used.

Local forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### fal.ai

See `lib/imageProvider.ts`. NSFW threshold 0.45; manual review optional.

### Resend

`ADMIN_EMAIL` receives operational mail. Delivery emails confirm digital-supply consent and label portraits as AI-generated.

### Prodigi

`POST` target is `api.sandbox.prodigi.com` until `PRODIGI_ENV=live`. Portrait is composed in `lib/puzzleSheet.ts` for board and lid.

### Vercel

`vercel.json` runs generation every 2 minutes and cleanup daily. Hobby plans may only allow daily cron — upgrade or use an external scheduler.

## How an order moves

`pending_payment → paid → generating → review → delivered`

Daily generation spend uses `MAX_DAILY_GEN_SPEND_GBP`. Cleanup: `GET /api/cron/cleanup`.

## Pricing

See `config/pricing.ts` and `config/prints.ts`. Referral codes (`PAW-……`) activate after the owner’s order is delivered.

## Pre-launch QA

- [ ] Brand env vars and legal pages reviewed by you
- [ ] Stripe sandbox payment + webhook, then live key
- [ ] Both checkout consent checkboxes tested; `npm test` passes
- [ ] `FAL_KEY` — real pet photo likeness check
- [ ] `MANUAL_REVIEW=true` — approve/regenerate/refund in `/admin`
- [ ] Resend domain verified; read delivery email (consent + AI label)
- [ ] Prodigi sandbox puzzle to your address; then `PRODIGI_ENV=live`
- [ ] Cookie banner: pixels only after Accept
- [ ] Cron firing on production plan
- [ ] VAT decision before Stripe Tax

## Useful commands

```bash
npm run dev
npm run seed
npm run typecheck
npm run test
npm run build
```
