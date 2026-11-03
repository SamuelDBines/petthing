# Pawtraitry content worker

Python FastAPI service that plans, renders, and queues daily social content for the pet portrait store. Nothing posts publicly until a human approves (unless you enable per-platform auto-approve). **Dry-run mode** writes videos and captions to disk without calling platform APIs.

Patterns mirror the owner's `splash` (9:16 shorts + captions + per-platform copy) and `feedkit` (daily plans + approve-before-post queue), adapted for before/after pet portrait reveals.

**Fixmonger (catalogue stores):** set `store_id=fixmonger` on queue rows and use the `fixmonger_product` template family for product demo / before-after clips (same approval flow as pet content).

## Quick start (dry-run)

From the monorepo root:

```bash
cd content-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/dry_run.py
```

Output lands in `.data/content-worker/output/pet-of-day-YYYYMMDD/` (`*.mp4`, `*.srt`, `*-captions.txt`).

Run the API locally:

```bash
uvicorn app.main:app --reload --port 8080
```

- Health: `GET /health`
- Admin queue UI: `GET /admin?token=<CONTENT_WORKER_SECRET>`
- Trigger daily plan: `POST /api/plan/daily` with `Authorization: Bearer <CONTENT_WORKER_SECRET>`

## Tests

```bash
cd content-worker && pytest
```

## Docker

```bash
docker build -t pawtraitry-content-worker .
docker run --rm -p 8080:8080 \
  -e CONTENT_WORKER_SECRET=dev-change-me \
  -e CONTENT_WORKER_DRY_RUN=true \
  -v "$(pwd)/../.data/content-worker:/data" \
  -e CONTENT_REPO_ROOT=/workspace \
  pawtraitry-content-worker
```

Mount the repo (or copy `public/examples`) so demo before/after images resolve.

## What it generates

| Job | Schedule (cron, Europe/London) | Output |
| --- | --- | --- |
| Pet of the day | `CONTENT_DAILY_PLAN_CRON` (default 07:00 daily) | 9:16 MP4 before/after reveal, SRT + caption file, per-platform copy |
| Style poll | `CONTENT_POLL_PLAN_CRON` (default Monday 10:00) | Text-only poll post (Christmas style list from 1 Nov) |

Christmas copy and style lists switch automatically from 1 November.

## Approval queue

All items start as `pending_approval`. Approve via:

- `POST /api/queue/{id}/approve` with `{"approve": true}` — marks approved and runs publishers (skipped when `CONTENT_WORKER_DRY_RUN=true`).
- `POST /api/queue/{id}/approve` with `{"approve": false}` — rejects.

Set `CONTENT_AUTO_APPROVE_PLATFORMS` JSON, e.g. `{"instagram": true}`, to auto-publish only those platforms after approval is not required for them (item still needs approve unless you extend workflow).

## Customer service (Resend inbound)

`POST /webhooks/resend/inbound` accepts Resend inbound payloads, looks up the latest order by sender email on `DATABASE_URL`, and enqueues a **draft reply** (`cs_reply`) for approval. No email is sent automatically.

Optional: set `RESEND_WEBHOOK_SECRET` and verify `resend-signature` / `x-resend-signature` (HMAC-SHA256 of raw body).

## Pet sources

1. **`content_pet_pool`** — curated before/after paths (seeded with repo demo images on first run).
2. **`DATABASE_URL`** — latest delivered `pet` order with `consent_at` (upload/result asset paths). For explicit marketing opt-in, sync approved rows into `content_pet_pool` or add a `social_share_opt_in` column in the main app later.
3. **Demo files** — `CONTENT_DEMO_BEFORE` / `CONTENT_DEMO_AFTER` under `CONTENT_REPO_ROOT`.

## Publishing adapters

Each adapter is registered only when credentials are set (`GET /health` lists enabled platforms).

| Platform | Env vars | Notes |
| --- | --- | --- |
| YouTube Shorts | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | `videos.insert` resumable upload |
| Instagram Reels | `META_ACCESS_TOKEN`, `META_IG_USER_ID` | Requires public `video_url` in payload for Graph API |
| Pinterest | `PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID` | API v5 video pin |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN` | Posts as private/draft until app audit |
| X | `X_ENABLED=true` plus OAuth1 + `X_BEARER_TOKEN` | Off by default (paid API); link in reply tweet |

Instagram/Pinterest need HTTPS-hosted video URLs in production; the worker stores local paths until you upload to object storage and set `video_url` on payloads before publish.

## Spend cap

`CONTENT_MAX_DAILY_AI_SPEND_GBP` limits OpenAI copy generation (and any future FAL usage). Template copy is used when the cap is exceeded or keys are missing. Spend is tracked in `content_daily_spend`.

## Environment reference

See `.env.example` for every variable. Core secrets:

- `CONTENT_WORKER_SECRET` — admin API + UI token
- `CONTENT_WORKER_DRY_RUN` — `true` in staging (default)
- `DATABASE_URL` — same Postgres as the Next.js app for orders/assets
- Platform blocks as in the table above

## Going live checklist

1. Set `CONTENT_WORKER_DRY_RUN=false` only on the production worker.
2. Provide `DATABASE_URL` and populate `content_pet_pool` with opted-in customer before/after URLs (signed or public).
3. Configure at least one publisher; complete TikTok app audit before public TikTok posts.
4. Host video files on HTTPS storage and pass `video_url` for Meta/Pinterest.
5. Point Resend inbound webhook at `/webhooks/resend/inbound`.
6. Run behind HTTPS with cron or rely on built-in APScheduler (disable duplicate crons if you also use external cron hitting `/api/plan/daily`).
7. Keep `X_ENABLED=false` unless you have a paid X developer tier.

This PR does **not** include real credentials, production deploys, or live posting.
