import { getStore } from "@/lib/store";
import { insertEmailSignup } from "@/lib/db/crm-methods";
import type { SignupSource } from "@/lib/crm/types";

export async function recordEmailSignup(args: {
  storeId: string;
  email: string;
  source: SignupSource;
  name?: string | null;
  marketingConsent?: boolean;
  utm?: Record<string, string>;
  referrer?: string | null;
  visitorSessionId?: string | null;
  excludedFromMetrics?: boolean;
}) {
  if (!args.email?.includes("@")) return;
  try {
    const store = getStore();
    if ("recordEmailSignup" in store && typeof store.recordEmailSignup === "function") {
      await (store as { recordEmailSignup: (a: typeof args) => Promise<void> }).recordEmailSignup(args);
      return;
    }
    await insertEmailSignup(args);
    if (args.marketingConsent) {
      const { sendShopWelcomeEmail } = await import("@/lib/shop/emails");
      await sendShopWelcomeEmail({
        storeId: args.storeId,
        email: args.email,
        firstName: args.name,
      }).catch((err) => console.error("[crm] welcome email failed", err));
    }
  } catch (error) {
    console.error("[crm] recordEmailSignup failed (non-blocking)", error);
  }
}
