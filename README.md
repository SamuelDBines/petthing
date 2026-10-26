# Portrait Spell

Seasonal portraits and cards from a customer's own photos. The name lives in one place: `APP_NAME` in `config/brand.ts`.

Halloween is the launch theme (through 31 October 2026). Christmas is already in the config and turns on by date on 1 November.

The app runs locally with **no accounts**. Payments, image generation, email, and printing switch on when you add keys. Until then, checkout is a demo button, portraits are labelled placeholders, and emails are written to `.data/outbox`.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run seed
npm run dev
```

`.env.local` in this folder already has local-only secrets. Admin password: `portrait-dev`.

- Landing: http://localhost:3000
- Create flow: http://localhost:3000/create
- Admin: http://localhost:3000/admin
- After `npm run seed`, the terminal prints a demo gallery URL. That order is already delivered, so you can open the results page, the card builder, and the share preview without paying.

On the create flow, leave Stripe empty. "Pay securely" marks the order paid and queues jobs. On the success page, **Paint the portraits now** runs the queue. With no `FAL_KEY`, each image is a coloured placeholder so you can test delivery, review, and the gallery.

`MANUAL_REVIEW` defaults to on. After painting, the order sits in admin until you approve it. Set `MANUAL_REVIEW=false` in `.env.local` if you want the demo to email itself straight away.

## Accounts you need before going live

Nothing below is wired to a real call until the env var is set. Do these before you point a domain at Vercel.

| Account | What for | Env vars |
| --- | --- | --- |
| Supabase | Postgres + private Storage. Required on Vercel. Locally the app uses `.data/db.json` instead. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe sandbox, then live | Checkout in GBP, promotion codes, refunds, UK shipping address for prints. Use a [restricted key](https://docs.stripe.com/keys#limit-api-secret-keys) (`rk_`). New work should use a [sandbox](https://docs.stripe.com/sandboxes), not the shared test mode. The Stripe CLI can create one with `stripe sandbox create`. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| fal.ai | Identity-preserving generation via Flux Kontext multi (`fal-ai/flux-pro/kontext/multi`, about $0.04 per image) and the NSFW check (`fal-ai/imageutils/nsfw`). | `FAL_KEY` |
| Resend | Delivery, pre-order, referral, and spend-cap emails. | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` |
| Prodigi | UK print-on-demand. Start on the sandbox. | `PRODIGI_API_KEY`, `PRODIGI_ENV` |
| Vercel | Hosting and cron. Frequent crons need a plan that allows them. | `CRON_SECRET` plus the rest |
| Meta / TikTok | Optional ads pixels. They load only after cookie consent. | `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` |

Also set, and treat as secrets:

- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- `FILE_SIGNING_SECRET` (signs local file links; Supabase uses its own signed URLs)
- `IP_HASH_SALT`
- `NEXT_PUBLIC_APP_URL` (https://your-domain)
- `MAX_DAILY_GEN_SPEND_GBP` (default 25)
- `USD_TO_GBP` (default 0.78, used only to log fal's dollar price in pounds)
- `MANUAL_REVIEW=true` for launch

Do **not** turn on Stripe Tax in code until you have an active VAT registration. This app does not set `automatic_tax`. Add it yourself after that registration exists, or Checkout will look like it is charging VAT when it is not.

## Connect each service

### Supabase

1. Create a project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates the tables, turns on row level security with no public policies (only the service role can read them), and creates private `uploads` and `results` buckets.
3. Put the project URL and the **service role** key in the env. Never expose the service role to the browser.

### Stripe

1. Create a sandbox and a restricted key that can create Checkout Sessions, read sessions, and create refunds.
2. Webhook endpoint: `https://your-domain/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
4. Fulfillment runs in the webhook, not on the success page. Generation is **not** done inside the webhook. The webhook marks the order paid and inserts jobs.
5. Promotion codes: create a coupon and promotion codes in the Dashboard. Checkout turns on `allow_promotion_codes` unless the customer already used a referral code (those are 20% off and are not stacked).
6. Local forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Dynamic payment methods are on. The code does not pass `payment_method_types`.

### fal.ai

The provider interface is `lib/imageProvider.ts`. The built-in provider posts to the queue API:

`POST https://queue.fal.run/fal-ai/flux-pro/kontext/multi`

with `prompt`, `image_urls`, `safety_tolerance: "1"`, and `aspect_ratio: "3:4"`. Kontext keeps people and pets from several reference photos. It has no negative-prompt field, so the negative prompt is written into the prompt as "Do not include". Swap models by changing `FAL_MODEL_ID` or by adding another class that implements `ImageProvider`.

Reference photos must be HTTPS URLs fal can fetch. That means Supabase signed URLs. Localhost files cannot be sent to fal. The local placeholder provider is what you use without a key.

Uploads and outputs are checked with `POST https://fal.run/fal-ai/imageutils/nsfw`. Anything at or above a 0.45 NSFW probability is rejected. Kontext also returns `has_nsfw_concepts`, and blocked outputs are retried. Violence and gore are kept out by the prompts, `safety_tolerance: "1"`, and the manual review queue. The NSFW model itself scores nudity and sexual content, not a separate gore label.

Family and group orders append a stricter negative list (no scary children, weapons, horror makeup, or occult symbols). Every style prompt requires subjects to stay fully clothed in costume.

### Resend

Verify the domain you send from. `EMAIL_FROM` looks like `Portrait Spell <hello@yourdomain.com>`. `ADMIN_EMAIL` receives review-ready, failure, print, and spend-cap messages. Without a key, the same HTML is saved under `.data/outbox`.

### Prodigi

The posted product is one 252-piece jigsaw, SKU `JIGSAW-PUZZLE-252`, made in the UK and supplied in a tin. Orders go to `POST /v4.0/orders` on the sandbox host until `PRODIGI_ENV=live`.

The portrait is composed onto two files before the order: the board at 375×285mm (300dpi) and the lid at 869×674px. Both keep the whole portrait, with paper either side, because the boards are landscape. The order sends those files as print areas `default` and `lid`.

Confirm the SKU with `GET /v4.0/products/JIGSAW-PUZZLE-252` once you have a key. The lookup runs before every order and stops if Prodigi returns 404. Override the SKU with `PRODIGI_SKU_PUZZLE`.

The customer price is £34.99. Prodigi’s published wholesale starts at £10 before tax and postage, and the exact 252-piece quote is in your dashboard. Change `pricePence` in `config/prints.ts` if that quote does not leave room.

Print checkout is Stripe-only, because that is where the UK shipping address is collected. Demo checkout cannot place a puzzle. Prodigi also has to be able to download the files, so the site address cannot be localhost.

### Vercel

`vercel.json` runs generation every 2 minutes and cleanup daily at 03:20 UTC. Hobby plans only allow a daily cron, which is too slow for the priority-delivery promise. Use a plan that allows the schedule, or an external scheduler that calls `GET /api/cron/generate` with `Authorization: Bearer $CRON_SECRET`.

Set every env var in the Vercel project. The JSON store throws on Vercel if Supabase is missing.

## How an order moves

`pending_payment → paid → generating → review → delivered`

`failed` and `refunded` are the other terminals. Approve in admin sends the email and starts the 7-day / 30-day deletion clocks. Cleanup is `GET /api/cron/cleanup`. Unpaid drafts and their photos are removed after 48 hours.

Daily generation spend is the fal price converted with `USD_TO_GBP`. If it passes `MAX_DAILY_GEN_SPEND_GBP`, the queue halts and `ADMIN_EMAIL` gets one message that day. Unpause it in admin.

## Add a theme

1. Add a theme object to `config/themes.ts` with `id`, `name`, `startsOn`, `endsOn`, `deadlineIso`, hero copy, and styles. Style names must be original. No film, TV, game, or brand characters.
2. Add a prompt per style id in `config/stylePrompts.ts`. The file refuses to boot if a prompt is missing, if copy mentions a blocked brand, or if a prompt does not keep people clothed. Use `{subject}` where the pet / family / couple / person line should go.
3. Leave admin theme mode on **Automatic by date**, or pin the theme manually to preview it.
4. Prices stay in `config/pricing.ts`. Deluxe means every style on the active theme. Image counts are split across the styles the customer picked.

Christmas is already there (`startsOn: 2026-11-01`). A pre-order charges £7.99, stores the row, and emails the customer. If they pre-order from a finished gallery, that order's uploads are kept until 15 November so you still have references. Pre-orders are listed in admin. Starting the Christmas portraits on 1 November means creating those orders in the create flow (or regenerating from kept photos) once the theme is active. The pre-order itself does not silently spend generation money.

## Pricing

| Offer | Price |
| --- | --- |
| Mini · 1 style, 2 images | £5.99 |
| Classic · 2 styles, 6 HD images | £10.99 |
| Deluxe · all styles, 12 HD images, card builder | £15.99 |
| Priority delivery | £2.99 |
| 3 more styles after delivery | £4.99 |
| 252-piece puzzle, UK postage | £34.99 |
| Christmas pre-order | £7.99 |

Referral codes (`SPELL-……`) work after the owner's order is delivered. The friend gets 20% off the tier. The owner gets one extra style queued, and an email when it is ready.

## Pre-launch checklist

- [ ] Rename `APP_NAME` and the support address if you want to.
- [ ] Supabase migration applied. Buckets are private. Service role is server-only.
- [ ] Stripe sandbox payment and webhook tested, then live restricted key. Webhook signature verified.
- [ ] Promotion codes created in Stripe.
- [ ] `FAL_KEY` set. One real pet photo and one real family photo checked for likeness.
- [ ] Spend cap set to a number you can afford to lose in a day.
- [ ] `MANUAL_REVIEW=true`. You can approve, regenerate one style, refund, and resend from `/admin`.
- [ ] Resend domain verified. Place a real order and read the delivery email.
- [ ] Prodigi sandbox puzzle ordered to your own address. SKU `JIGSAW-PUZZLE-252` confirmed, and the £34.99 price checked against the dashboard quote. UK address only.
- [ ] Cookie banner checked: pixels do not load before Accept.
- [ ] Privacy and refund pages match what you will actually do.
- [ ] Delete the seed order if you ever pointed seed at a remote database (`npm run seed` refuses to be your production gallery; it writes the local store unless Supabase env vars are present).
- [ ] Cron actually firing. Priority delivery is meaningless if the queue runs once a day.
- [ ] VAT decision made before you enable Stripe Tax.

## Useful commands

```bash
npm run dev
npm run seed
npm run typecheck
npm run build
```

Demo checkout is refused in production and whenever `STRIPE_SECRET_KEY` is set. The dev queue route `/api/dev/process` is refused in production. Admin "Run queue" stays available.
