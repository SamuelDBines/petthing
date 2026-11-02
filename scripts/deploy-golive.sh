#!/usr/bin/env bash
# Safe Pawtraitry web deploy (replacement for the lost box deploy-golive.sh).
#
# Usage: EXPECT_SHA=<full-or-short sha> scripts/deploy-golive.sh
#
# - Builds the web image from the EXACT committed SHA (git archive, so no
#   uncommitted files) with Kaniko inside the cluster (ns hosting-builds,
#   push creds secret docr-push). No local docker needed.
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
BUILD_NS=hosting-builds
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
cat > "$CTX/Dockerfile.golive" <<'DOCK'
FROM node:22-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG SITE_NOINDEX
ENV SITE_NOINDEX=$SITE_NOINDEX
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build
ENV NODE_ENV=production PORT=3000
ENV NODE_OPTIONS=
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
DOCK
POD="golive-$SHORT-$RANDOM"
tar -C "$CTX" --exclude=node_modules --exclude=.next -czf - . | kubectl -n $BUILD_NS run "$POD" -i --rm --restart=Never \
  --image=gcr.io/kaniko-project/executor:v1.23.2 \
  --overrides='{"spec":{"containers":[{"name":"'"$POD"'","image":"gcr.io/kaniko-project/executor:v1.23.2","stdin":true,"stdinOnce":true,
    "args":["--context=tar://stdin","--dockerfile=Dockerfile.golive","--destination='"$IMAGE"'","--snapshot-mode=redo","--use-new-run","--compressed-caching=false","--single-snapshot"],
    "resources":{"requests":{"memory":"2Gi","cpu":"1"},"limits":{"memory":"2900Mi"}},
    "volumeMounts":[{"name":"docr","mountPath":"/kaniko/.docker"}]}],
    "volumes":[{"name":"docr","secret":{"secretName":"docr-push","items":[{"key":"config.json","path":"config.json"}]}}]}}'
crane digest "$IMAGE" >/dev/null || { echo "image not in registry"; exit 1; }

echo "$PREV" > scripts/.rollback-golive.prev
kubectl -n $NS set image deploy/web web="$IMAGE"
kubectl -n $NS rollout status deploy/web --timeout=600s
RUNNING=$(kubectl -n $NS get pods -l app=web -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)
[[ "$RUNNING" == "$IMAGE" ]] || { echo "pods not all on $IMAGE: $RUNNING"; exit 1; }
echo "$(date -u +%FT%TZ) $SHA $IMAGE prev=$PREV" >> scripts/.deploy-history
echo "DEPLOYED $IMAGE (rollback: $PREV)"
