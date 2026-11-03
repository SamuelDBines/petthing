#!/usr/bin/env bash
# Safe Pawtraitry web deploy (replacement for the lost box deploy-golive.sh).
#
# Usage: EXPECT_SHA=<full-or-short sha> scripts/deploy-golive.sh
#
# - Builds the web image from the EXACT committed SHA (git archive, so no
#   uncommitted files) on the box with Node 22, then crane append onto node:22-bookworm-slim.
#   No docker needed; uses the box's existing DOCR login.
# - Refuses to run if HEAD != EXPECT_SHA.
# - Rolls out ONLY deployment/web in pawtraitry-staging, then verifies the
#   running pods use the new image tag.
# - Never calls deploy.sh. Never touches the pg-backup CronJob. Never sets
#   ALLOW_DEMO_CHECKOUT or FAL_FORCE_CREDIT_EXHAUSTED (and aborts if either
#   is present in web-config / pawtraitry-app).
# - Records the previous live image in scripts/.rollback-golive.prev and
#   appends to scripts/.deploy-history.
#
# Rollout strategy note: the live Deployment was hand-patched to
# maxSurge 0 / maxUnavailable 1 (nodes are small), so a rollout has a brief
# window with one fewer pod. k8s/deploy/web-deployment.yaml says 1/0. Pick one
# and make the manifest match before relying on zero-downtime.
#
# Rollback: kubectl -n pawtraitry-staging set image deploy/web web="$(cat scripts/.rollback-golive.prev)"
set -euo pipefail
NS=pawtraitry-staging
REPO=registry.digitalocean.com/repkit/repkit
cd "$(git rev-parse --show-toplevel)"
: "${EXPECT_SHA:?set EXPECT_SHA}"
SHA=$(git rev-parse HEAD); SHORT=${SHA:0:7}
[[ "$SHA" == "$EXPECT_SHA"* ]] || { echo "HEAD $SHA != EXPECT_SHA $EXPECT_SHA"; exit 1; }
git diff --quiet HEAD || echo "warn: working tree dirty; building committed $SHORT only"
export DIGITALOCEAN_ACCESS_TOKEN=${DIGITALOCEAN_ACCESS_TOKEN:-${DIGITALOCEAN_TOKEN:-}}

for k in ALLOW_DEMO_CHECKOUT FAL_FORCE_CREDIT_EXHAUSTED; do
  if kubectl -n $NS get cm web-config -o json | python3 -c "import json,sys;sys.exit(0 if '$k' in json.load(sys.stdin).get('data',{}) else 1)" ||
     kubectl -n $NS get secret pawtraitry-app -o json | python3 -c "import json,sys;sys.exit(0 if '$k' in json.load(sys.stdin).get('data',{}) else 1)"; then
    echo "ABORT: $k is set on production"; exit 1; fi
done

PREV=$(kubectl -n $NS get deploy web -o jsonpath='{.spec.template.spec.containers[0].image}')
TAG="pawtraitry-web-${SHORT}-$(date +%y%m%d%H%M)"
IMAGE="$REPO:$TAG"
echo "prev=$PREV new=$IMAGE"

CTX=$(mktemp -d /tmp/golive.XXXXXX)
trap 'rm -rf -- "$CTX"' EXIT
git archive "$SHA" | tar -x -C "$CTX"
# Build on the box with Node 22 (same major/minor as the node:22-bookworm-slim
# base) and append /app as one layer with crane. The cluster has no spare
# capacity for an in-cluster Kaniko build (all nodes ~95% requested).
NODE22=${NODE22:-/tmp/node22}
[[ -x "$NODE22/bin/node" ]] || { mkdir -p "$NODE22"; curl -sL https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz | tar -xJ -C "$NODE22" --strip-components=1; }
mkdir -p "$CTX/root/app"
( shopt -s dotglob; for f in "$CTX"/*; do [[ "$f" == "$CTX/root" ]] || mv "$f" "$CTX/root/app/"; done )
( cd "$CTX/root/app" && export PATH="$NODE22/bin:$PATH" NEXT_TELEMETRY_DISABLED=1 SITE_NOINDEX= &&
  npm ci --no-audit --no-fund && NODE_ENV=production npm run build )
tar -C "$CTX/root" --owner=0 --group=0 -cf "$CTX/layer.tar" app
crane append -b node:22-bookworm-slim -f "$CTX/layer.tar" -t "$IMAGE.tmp"
crane mutate "$IMAGE.tmp" -t "$IMAGE" --workdir /app \
  --env NEXT_TELEMETRY_DISABLED=1 --env SITE_NOINDEX= --env NODE_ENV=production --env PORT=3000 \
  --label golive.sha="$SHA" --cmd npx,next,start,-H,0.0.0.0,-p,3000 >/dev/null
crane digest "$IMAGE" >/dev/null || { echo "image not in registry"; exit 1; }

echo "$PREV" > scripts/.rollback-golive.prev
kubectl -n $NS set image deploy/web web="$IMAGE"
kubectl -n $NS rollout status deploy/web --timeout=600s
RUNNING=$(kubectl -n $NS get pods -l app=web -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)
[[ "$RUNNING" == "$IMAGE" ]] || { echo "pods not all on $IMAGE: $RUNNING"; exit 1; }
echo "$(date -u +%FT%TZ) $SHA $IMAGE prev=$PREV" >> scripts/.deploy-history
echo "DEPLOYED $IMAGE (rollback: $PREV)"
