import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsEvent, Asset, Job, Order, Preorder, PrintOrder, Settings } from "@/lib/domain";
import { londonDay } from "@/lib/runtime";

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

function assertOk(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function orderFrom(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    storeId: String(row.store_id ?? "pawtraitry"),
    createdAt: String(row.created_at),
    email: String(row.email),
    themeId: String(row.theme_id),
    subjectType: row.subject_type as Order["subjectType"],
    tierId: row.tier_id as Order["tierId"],
    styleIds: (row.style_ids as string[]) ?? [],
    cardNames: String(row.card_names ?? ""),
    status: row.status as Order["status"],
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    amountPence: Number(row.amount_pence),
    priority: Boolean(row.priority),
    consentAt: String(row.consent_at),
    digitalSupplyConsentAt: String(row.digital_supply_consent_at ?? row.consent_at ?? ""),
    utm: (row.utm as Record<string, string>) ?? {},
    referralCodeUsed: (row.referral_code_used as string | null) ?? null,
    ownReferralCode: String(row.own_referral_code),
    resultsToken: String(row.results_token),
    uploadToken: String(row.upload_token),
    generationCostGbp: Number(row.generation_cost_gbp ?? 0),
    deliveredAt: (row.delivered_at as string | null) ?? null,
    photosDeleteAfter: (row.photos_delete_after as string | null) ?? null,
    resultsDeleteAfter: (row.results_delete_after as string | null) ?? null,
    ipHash: String(row.ip_hash ?? ""),
    uploadsDeletedAt: (row.uploads_deleted_at as string | null) ?? null,
    resultsDeletedAt: (row.results_deleted_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    processedSessions: (row.processed_sessions as string[]) ?? [],
    referralRewardGranted: Boolean(row.referral_reward_granted),
    pendingBonusEmail: Boolean(row.pending_bonus_email),
    offer: row.offer === "season_pass" ? "season_pass" : "one_off",
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    subscriptionStatus: row.subscription_status === "active" || row.subscription_status === "canceled" ? row.subscription_status : null,
    payments: (row.payments as Order["payments"]) ?? [],
  };
}

function orderTo(order: Order) {
  return {
    id: order.id,
    created_at: order.createdAt,
    email: order.email,
    theme_id: order.themeId,
    subject_type: order.subjectType,
    tier_id: order.tierId,
    style_ids: order.styleIds,
    card_names: order.cardNames,
    status: order.status,
    stripe_checkout_session_id: order.stripeCheckoutSessionId,
    stripe_payment_intent_id: order.stripePaymentIntentId,
    amount_pence: order.amountPence,
    priority: order.priority,
    consent_at: order.consentAt,
    digital_supply_consent_at: order.digitalSupplyConsentAt,
    utm: order.utm,
    referral_code_used: order.referralCodeUsed,
    own_referral_code: order.ownReferralCode,
    results_token: order.resultsToken,
    upload_token: order.uploadToken,
    generation_cost_gbp: order.generationCostGbp,
    delivered_at: order.deliveredAt,
    photos_delete_after: order.photosDeleteAfter,
    results_delete_after: order.resultsDeleteAfter,
    ip_hash: order.ipHash,
    uploads_deleted_at: order.uploadsDeletedAt,
    results_deleted_at: order.resultsDeletedAt,
    failure_reason: order.failureReason,
    processed_sessions: order.processedSessions,
    referral_reward_granted: order.referralRewardGranted,
    pending_bonus_email: order.pendingBonusEmail,
    offer: order.offer,
    stripe_subscription_id: order.stripeSubscriptionId,
    subscription_status: order.subscriptionStatus,
    payments: order.payments,
  };
}

function assetFrom(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    kind: row.kind as Asset["kind"],
    styleId: (row.style_id as string | null) ?? null,
    variantIndex: row.variant_index == null ? null : Number(row.variant_index),
    storagePath: String(row.storage_path),
    bucket: row.bucket as Asset["bucket"],
    contentType: String(row.content_type),
    moderation: row.moderation as Asset["moderation"],
    createdAt: String(row.created_at),
  };
}

function jobFrom(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    styleId: String(row.style_id),
    variantIndex: Number(row.variant_index),
    status: row.status as Job["status"],
    attempts: Number(row.attempts),
    providerRequestId: (row.provider_request_id as string | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    costGbp: Number(row.cost_gbp ?? 0),
    priority: Boolean(row.priority),
    lockedUntil: (row.locked_until as string | null) ?? null,
    nextRunAt: (row.next_run_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function jobTo(job: Job) {
  return {
    id: job.id,
    order_id: job.orderId,
    style_id: job.styleId,
    variant_index: job.variantIndex,
    status: job.status,
    attempts: job.attempts,
    provider_request_id: job.providerRequestId,
    last_error: job.lastError,
    cost_gbp: job.costGbp,
    priority: job.priority,
    locked_until: job.lockedUntil,
    next_run_at: job.nextRunAt,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

const patchMap: Record<string, string> = {
  createdAt: "created_at",
  themeId: "theme_id",
  subjectType: "subject_type",
  tierId: "tier_id",
  styleIds: "style_ids",
  cardNames: "card_names",
  stripeCheckoutSessionId: "stripe_checkout_session_id",
  stripePaymentIntentId: "stripe_payment_intent_id",
  amountPence: "amount_pence",
  consentAt: "consent_at",
  digitalSupplyConsentAt: "digital_supply_consent_at",
  referralCodeUsed: "referral_code_used",
  ownReferralCode: "own_referral_code",
  resultsToken: "results_token",
  uploadToken: "upload_token",
  generationCostGbp: "generation_cost_gbp",
  deliveredAt: "delivered_at",
  photosDeleteAfter: "photos_delete_after",
  resultsDeleteAfter: "results_delete_after",
  ipHash: "ip_hash",
  uploadsDeletedAt: "uploads_deleted_at",
  resultsDeletedAt: "results_deleted_at",
  failureReason: "failure_reason",
  processedSessions: "processed_sessions",
  referralRewardGranted: "referral_reward_granted",
  pendingBonusEmail: "pending_bonus_email",
  offer: "offer",
  stripeSubscriptionId: "stripe_subscription_id",
  subscriptionStatus: "subscription_status",
  payments: "payments",
  orderId: "order_id",
  styleId: "style_id",
  variantIndex: "variant_index",
  storagePath: "storage_path",
  contentType: "content_type",
  createdAtAsset: "created_at",
  providerRequestId: "provider_request_id",
  lastError: "last_error",
  costGbp: "cost_gbp",
  lockedUntil: "locked_until",
  nextRunAt: "next_run_at",
  updatedAt: "updated_at",
  productId: "product_id",
  assetId: "asset_id",
  prodigiOrderId: "prodigi_order_id",
  themeMode: "theme_mode",
  activeThemeId: "active_theme_id",
  salesPaused: "sales_paused",
  queueHalted: "queue_halted",
  haltReason: "halt_reason",
  haltNotifiedOn: "halt_notified_on",
};

function toSnake(patch: object) {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    row[patchMap[key] ?? key] = value;
  }
  return row;
}

function settingsFrom(row: Record<string, unknown>): Settings {
  return {
    themeMode: (row.theme_mode as Settings["themeMode"]) ?? "auto",
    activeThemeId: String(row.active_theme_id ?? "halloween"),
    salesPaused: Boolean(row.sales_paused),
    queueHalted: Boolean(row.queue_halted),
    haltReason: (row.halt_reason as string | null) ?? null,
    haltNotifiedOn: (row.halt_notified_on as string | null) ?? null,
  };
}

function printFrom(row: Record<string, unknown>): PrintOrder {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    productId: row.product_id as PrintOrder["productId"],
    assetId: String(row.asset_id),
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    prodigiOrderId: (row.prodigi_order_id as string | null) ?? null,
    status: row.status as PrintOrder["status"],
    shipping: (row.shipping as PrintOrder["shipping"]) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function preorderFrom(row: Record<string, unknown>): Preorder {
  return {
    id: String(row.id),
    storeId: String(row.store_id ?? "pawtraitry"),
    orderId: (row.order_id as string | null) ?? null,
    email: String(row.email),
    themeId: String(row.theme_id),
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    amountPence: Number(row.amount_pence),
    status: row.status as Preorder["status"],
    createdAt: String(row.created_at),
  };
}

export const supabaseStore = {
  async getSettings() {
    const { data, error } = await client().from("app_settings").select("*").eq("id", 1).maybeSingle();
    assertOk(error);
    if (!data) {
      const created = settingsFrom({});
      const inserted = await client().from("app_settings").insert({ id: 1, ...toSnake(created) }).select("*").single();
      assertOk(inserted.error);
      return settingsFrom(inserted.data);
    }
    return settingsFrom(data);
  },
  async updateSettings(patch: Partial<Settings>) {
    const { data, error } = await client().from("app_settings").update(toSnake(patch)).eq("id", 1).select("*").single();
    assertOk(error);
    return settingsFrom(data);
  },
  async createOrder(order: Order) {
    const { error } = await client().from("orders").insert(orderTo(order));
    assertOk(error);
  },
  async updateOrder(id: string, patch: Partial<Order>) {
    const { data, error } = await client().from("orders").update(toSnake(patch)).eq("id", id).select("*").single();
    assertOk(error);
    return orderFrom(data);
  },
  async getOrder(id: string) {
    const { data, error } = await client().from("orders").select("*").eq("id", id).maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async getOrderByToken(token: string) {
    const { data, error } = await client().from("orders").select("*").eq("results_token", token).maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async getOrderByUploadToken(orderId: string, token: string) {
    const { data, error } = await client()
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("upload_token", token)
      .maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async getOrderByCheckoutSession(sessionId: string) {
    const { data, error } = await client().from("orders").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async getOrderBySubscription(subscriptionId: string) {
    const { data, error } = await client().from("orders").select("*").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async getOrderByReferralCode(code: string) {
    const { data, error } = await client().from("orders").select("*").ilike("own_referral_code", code).maybeSingle();
    assertOk(error);
    return data ? orderFrom(data) : null;
  },
  async listOrders() {
    const { data, error } = await client().from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    assertOk(error);
    return (data ?? []).map((row) => orderFrom(row));
  },
  async addAsset(asset: Asset) {
    const { error } = await client().from("assets").insert({
      id: asset.id,
      order_id: asset.orderId,
      kind: asset.kind,
      style_id: asset.styleId,
      variant_index: asset.variantIndex,
      storage_path: asset.storagePath,
      bucket: asset.bucket,
      content_type: asset.contentType,
      moderation: asset.moderation,
      created_at: asset.createdAt,
    });
    assertOk(error);
  },
  async listAssets(orderId: string) {
    const { data, error } = await client().from("assets").select("*").eq("order_id", orderId);
    assertOk(error);
    return (data ?? []).map((row) => assetFrom(row));
  },
  async deleteAssets(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await client().from("assets").select("*").in("id", ids);
    assertOk(error);
    const { error: deleteError } = await client().from("assets").delete().in("id", ids);
    assertOk(deleteError);
    return (data ?? []).map((row) => assetFrom(row));
  },
  async addJobs(jobs: Job[]) {
    if (!jobs.length) return;
    const { error } = await client().from("jobs").insert(jobs.map(jobTo));
    assertOk(error);
  },
  async listJobs(orderId?: string) {
    let query = client().from("jobs").select("*");
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query.limit(1000);
    assertOk(error);
    return (data ?? []).map((row) => jobFrom(row));
  },
  async updateJob(id: string, patch: Partial<Job>) {
    const { data, error } = await client()
      .from("jobs")
      .update({ ...toSnake(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    assertOk(error);
    return jobFrom(data);
  },
  async claimJobs(limit: number) {
    const { data, error } = await client()
      .from("jobs")
      .select("*")
      .in("status", ["queued", "submitted", "running"])
      .order("created_at", { ascending: true })
      .limit(200);
    assertOk(error);
    const now = Date.now();
    const candidates = (data ?? [])
      .map((row) => jobFrom(row))
      .filter((job) => job.status !== "running" || now - Date.parse(job.updatedAt) >= 8 * 60 * 1000);
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
    const picked = candidates.slice(0, limit);
    for (const job of picked) {
      await this.updateJob(job.id, { status: "running" });
    }
    return picked.map((job) => ({ ...job, status: "running" as const }));
  },
  async addEvent(event: AnalyticsEvent) {
    const { error } = await client().from("events").insert({
      id: event.id,
      type: event.type,
      order_id: event.orderId,
      created_at: event.createdAt,
    });
    assertOk(error);
  },
  async countEvents(type: AnalyticsEvent["type"], day?: string) {
    const { data, error } = await client().from("events").select("created_at").eq("type", type).limit(5000);
    assertOk(error);
    return (data ?? []).filter((row) => !day || londonDay(new Date(String(row.created_at))) === day).length;
  },
  async addPrint(print: PrintOrder) {
    const { error } = await client().from("prints").insert({
      id: print.id,
      order_id: print.orderId,
      product_id: print.productId,
      asset_id: print.assetId,
      stripe_checkout_session_id: print.stripeCheckoutSessionId,
      stripe_payment_intent_id: print.stripePaymentIntentId,
      prodigi_order_id: print.prodigiOrderId,
      status: print.status,
      shipping: print.shipping,
      error: print.error,
      created_at: print.createdAt,
    });
    assertOk(error);
  },
  async listPrints(orderId?: string) {
    let query = client().from("prints").select("*");
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
    assertOk(error);
    return (data ?? []).map((row) => printFrom(row));
  },
  async getPrintBySession(sessionId: string) {
    const { data, error } = await client().from("prints").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
    assertOk(error);
    return data ? printFrom(data) : null;
  },
  async updatePrint(id: string, patch: Partial<PrintOrder>) {
    const { data, error } = await client().from("prints").update(toSnake(patch)).eq("id", id).select("*").single();
    assertOk(error);
    return printFrom(data);
  },
  async addPreorder(preorder: Preorder) {
    const { error } = await client().from("preorders").insert({
      id: preorder.id,
      order_id: preorder.orderId,
      email: preorder.email,
      theme_id: preorder.themeId,
      stripe_checkout_session_id: preorder.stripeCheckoutSessionId,
      stripe_payment_intent_id: preorder.stripePaymentIntentId,
      amount_pence: preorder.amountPence,
      status: preorder.status,
      created_at: preorder.createdAt,
    });
    assertOk(error);
  },
  async listPreorders() {
    const { data, error } = await client().from("preorders").select("*").order("created_at", { ascending: false }).limit(200);
    assertOk(error);
    return (data ?? []).map((row) => preorderFrom(row));
  },
  async getPreorderBySession(sessionId: string) {
    const { data, error } = await client().from("preorders").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
    assertOk(error);
    return data ? preorderFrom(data) : null;
  },
  async updatePreorder(id: string, patch: Partial<Preorder>) {
    const { data, error } = await client().from("preorders").update(toSnake(patch)).eq("id", id).select("*").single();
    assertOk(error);
    return preorderFrom(data);
  },
  async hitRateLimit(key: string, limit: number, windowMs: number) {
    const supabase = client();
    const now = Date.now();
    const { data, error } = await supabase.from("rate_buckets").select("*").eq("bucket_key", key).maybeSingle();
    assertOk(error);
    if (!data || Date.parse(String(data.reset_at)) < now) {
      const resetAt = new Date(now + windowMs).toISOString();
      const { error: upsertError } = await supabase.from("rate_buckets").upsert({ bucket_key: key, count: 1, reset_at: resetAt });
      assertOk(upsertError);
      return { ok: true as const, remaining: limit - 1 };
    }
    if (Number(data.count) >= limit) return { ok: false as const, remaining: 0 };
    const next = Number(data.count) + 1;
    const { error: updateError } = await supabase.from("rate_buckets").update({ count: next }).eq("bucket_key", key);
    assertOk(updateError);
    return { ok: true as const, remaining: limit - next };
  },
  async addSpend(gbp: number) {
    const supabase = client();
    const day = londonDay();
    const { data, error } = await supabase.from("daily_spend").select("*").eq("day", day).maybeSingle();
    assertOk(error);
    const total = Math.round(((data ? Number(data.gbp) : 0) + gbp) * 10000) / 10000;
    const { error: upsertError } = await supabase.from("daily_spend").upsert({ day, gbp: total });
    assertOk(upsertError);
    return total;
  },
  async todaySpend() {
    const { data, error } = await client().from("daily_spend").select("gbp").eq("day", londonDay()).maybeSingle();
    assertOk(error);
    return data ? Number(data.gbp) : 0;
  },
};
