import { isFalCreditExhaustedHttp } from "@/lib/fal/credit-exhaustion";
import type { Order, Settings } from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import { getStore } from "@/lib/store";

export const FAL_BILLING_URL = "https://fal.ai/dashboard/billing";
export const FAL_OWNER_ALERT_EMAIL = "samuelbines@gmail.com";
export const FAL_CREDIT_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const FAL_CREDIT_SLA_MS = 24 * 60 * 60 * 1000;
export const FAL_CREDIT_JOB_RETRY_MS = 10 * 60 * 1000;

const DEFAULT_STORE = "pawtraitry";

function modelPath(env: NodeJS.ProcessEnv = process.env) {
  return env.FAL_MODEL_ID?.trim() || "fal-ai/flux-pro/kontext/multi";
}

export function falCreditForcedExhausted(env: NodeJS.ProcessEnv = process.env) {
  return env.FAL_FORCE_CREDIT_EXHAUSTED === "1";
}

/** Lightweight: status poll for a non-existent request — 404 means auth OK; 402/403 credit lock means exhausted. */
export async function probeFalCreditAvailable(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (falCreditForcedExhausted(env)) return false;
  const key = env.FAL_KEY?.trim();
  if (!key) return false;
  const path = modelPath(env);
  const url = `https://queue.fal.run/${path}/requests/credit-probe-${Date.now()}/status`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Key ${key}` } });
    const text = await response.text();
    if (isFalCreditExhaustedHttp(response.status, text)) return false;
    return true;
  } catch {
    return false;
  }
}

export function countWaitingForCreditOrders(orders: Order[]) {
  return orders.filter((o) => o.status === "waiting_for_credit").length;
}

export function ordersWaitingOverSla(orders: Order[], nowMs = Date.now()) {
  return orders.filter(
    (o) => o.status === "waiting_for_credit" && nowMs - Date.parse(o.createdAt) >= FAL_CREDIT_SLA_MS,
  );
}

export function shouldSendFalCreditAlert(settings: Settings, nowMs = Date.now()) {
  const last = settings.falCreditAlertSentAt ? Date.parse(settings.falCreditAlertSentAt) : 0;
  if (!last) return true;
  return nowMs - last >= FAL_CREDIT_ALERT_COOLDOWN_MS;
}

async function emailSam(subject: string, html: string) {
  await sendEmail({
    to: FAL_OWNER_ALERT_EMAIL,
    subject,
    html,
    storeId: DEFAULT_STORE,
    stripeLivemode: true,
  });
}

export async function markFalCreditExhausted(reason: string) {
  const store = getStore();
  const settings = await store.getSettings(DEFAULT_STORE);
  const now = new Date().toISOString();
  const patch: Partial<Settings> = {
    falCreditExhaustedSince: settings.falCreditExhaustedSince ?? now,
  };
  const orders = await store.listOrders("all");
  const waiting = countWaitingForCreditOrders(orders);
  const slaOverdue = ordersWaitingOverSla(orders).length;

  if (shouldSendFalCreditAlert({ ...settings, ...patch })) {
    patch.falCreditAlertSentAt = now;
    const slaNote =
      slaOverdue > 0
        ? `<p><strong>${slaOverdue}</strong> order(s) have waited over 24 hours — consider refunding manually.</p>`
        : "";
    await emailSam(
      `fal.ai credit ran out: ${waiting} order(s) waiting`,
      `<p>fal.ai returned a credit/billing lock (${reason}). Portrait generation is paused; checkout still works.</p>
       <p><strong>${waiting}</strong> order(s) in <code>waiting_for_credit</code>.</p>
       ${slaNote}
       <p><a href="${FAL_BILLING_URL}">Top up fal.ai billing</a></p>`,
    );
  }
  await store.updateSettings(patch, DEFAULT_STORE);
}

export async function pauseOrderForFalCredit(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status === "refunded" || order.status === "waiting_for_credit") return;
  await store.updateOrder(orderId, { status: "waiting_for_credit", failureReason: null });
}

export async function resumeWaitingForCreditOrders() {
  const store = getStore();
  const waiting = (await store.listOrders("all")).filter((o) => o.status === "waiting_for_credit");
  for (const order of waiting) {
    await store.updateOrder(order.id, { status: "generating", failureReason: null });
    const jobs = await store.listJobs(order.id);
    for (const job of jobs) {
      if (job.status === "done") continue;
      await store.updateJob(job.id, {
        status: "queued",
        nextRunAt: new Date().toISOString(),
        lockedUntil: null,
      });
    }
  }
  return waiting.length;
}

export async function clearFalCreditExhaustedState() {
  const store = getStore();
  await store.updateSettings(
    {
      falCreditExhaustedSince: null,
      falCreditAlertSentAt: null,
    },
    DEFAULT_STORE,
  );
}

export async function notifyFalCreditRecovered(resumedCount: number) {
  if (resumedCount <= 0) return;
  await emailSam(
    `fal.ai credit recovered: ${resumedCount} order(s) resumed`,
    `<p>fal.ai is accepting requests again. <strong>${resumedCount}</strong> portrait order(s) returned to the generation queue.</p>`,
  );
}

export async function runFalCreditRecovery() {
  const store = getStore();
  const settings = await store.getSettings(DEFAULT_STORE);
  if (!settings.falCreditExhaustedSince) {
    return { ok: true, skipped: true as const };
  }
  const available = await probeFalCreditAvailable();
  if (!available) {
    const orders = await store.listOrders("all");
    const waiting = countWaitingForCreditOrders(orders);
    const slaOverdue = ordersWaitingOverSla(orders).length;
    if (shouldSendFalCreditAlert(settings) && (waiting > 0 || slaOverdue > 0)) {
      await markFalCreditExhausted("still exhausted (scheduled check)");
    }
    return { ok: true, stillExhausted: true as const, waiting, slaOverdue };
  }
  const resumed = await resumeWaitingForCreditOrders();
  await clearFalCreditExhaustedState();
  await notifyFalCreditRecovered(resumed);
  return { ok: true, resumed };
}

export async function falCreditAdminBanner() {
  const store = getStore();
  const settings = await store.getSettings(DEFAULT_STORE);
  const orders = await store.listOrders("all");
  const waiting = countWaitingForCreditOrders(orders);
  const slaOverdue = ordersWaitingOverSla(orders).length;
  const active = Boolean(settings.falCreditExhaustedSince) || waiting > 0;
  return { active, waiting, slaOverdue, since: settings.falCreditExhaustedSince };
}
