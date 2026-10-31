# PARKED (31 Oct 2026)

Sam has parked this product. No new work, merges or deploys until he says otherwise.

## Where it's left
- pawtraitry.com is live in k8s namespace `pawtraitry-staging` (cluster `london-cluster`, lon1), running commit 100e00d, image `registry.digitalocean.com/repkit/repkit:pawtraitry-web-100e00d-f1c2ea-live`.
- Offer: 3 free watermarked previews, a £5.99 digital pack, and Prodigi printed gifts. No paid orders yet.
- Fixmonger and Jinglefold are test-mode and noindex.

## What's live (checked with kubectl, 31 Oct)
- Deployments: `web` (100e00d), `content-worker` (`pawtraitry-cw-4623de1-f1c2ea`). StatefulSet pod `postgres-0`.
- PVCs: web-data 2Gi, content-worker-data 1Gi, data-postgres-0 1Gi.
- CronJobs: cleanup (20 3 * * *), cron-abandoned-basket (0 */2), cron-admin-digest (0 7), cron-order-watchdog (30 */4), cron-shop-fulfillment (15 * * * *), fal-credit-recovery (*/10), generate (*/2), partner-fulfillment (0 */6). None suspended.
- Stripe live webhook: `we_1UVWOsGopvhhCcxx4BmBkStN`.
- Email via Relay Email.

## Running costs
- The cluster is shared with other projects, so Pawtraitry's share is unknown. Whole cluster per doctl: 3 x s-1vcpu-2gb ($12/mo each) + 3 x s-2vcpu-4gb ($24/mo each) = $108/mo, plus one lb-small load balancer.
- Pawtraitry block storage: 4 GiB of PVCs (DO list price about $0.10/GiB/mo, so about $0.40/mo).
- DO registry `repkit`: shared; plan tier unknown (not readable with doctl).
- fal.ai usage: unknown (not checked). The `generate` and `fal-credit-recovery` crons keep running.
- Meta: campaign "PT Launch Test - Sales" (ad account 2118718188752481) turned off 31 Oct, spent £0.

## Open items
- Meta ad account 2118718188752481 has no payment method. Future ads go on Sam's personal ad account.
- Rollout strategy for `web` must be maxSurge 0 / maxUnavailable 1 because the node is full (currently set that way; deploy-golive.sh resets it to maxSurge 1).
- Companies House accounts due 10 Nov.
- The box's `deploy-golive.sh`, rollback files (`rollback-golive.prev`) and deploy history were accidentally deleted on 31 Oct. Rebuild them before any deploy or rollback.

## Unmerged branches and PRs (all open)
- PR #4 Multi-store analytics, Meta ads, email v23 (`cursor/multi-store-analytics-102a` -> `cursor/local-integration-566f`). This is what's live.
- PR #3 Local dev stack (`cursor/local-integration-566f` -> main)
- PR #2 Rebrand to Pawtraitry (`cursor/pawtraitry-rebrand-legal-f2ca` -> main)
- PR #1 Content worker (`cursor/content-worker-5adf` -> main)
- main is at 6db51ea and does not include the live code.

## To resume
1. Rebuild deploy-golive.sh, rollback pointer and deploy history from the repo, Sam's Mac or the cluster.
2. Decide whether to merge PRs #1 to #4 into main.
3. Add a payment method or move ads to the personal ad account, then turn the campaign back on.
4. Fix node capacity or keep maxSurge 0 for rollouts.
5. Optionally suspend crons or scale down to save cost (Sam's call).
