import { z } from "zod";

export const metaAttributionBodySchema = z
  .object({
    metaPurchaseEventId: z.string().max(120).optional(),
    metaInitiateCheckoutEventId: z.string().max(120).optional(),
    metaMarketingConsent: z.boolean().optional(),
    metaFbp: z.string().max(200).optional(),
    metaFbc: z.string().max(300).optional(),
  })
  .partial();

export type MetaAttributionBody = z.infer<typeof metaAttributionBodySchema>;

export function metaContextFromBody(body: MetaAttributionBody | undefined) {
  if (!body?.metaPurchaseEventId) return null;
  return {
    purchaseEventId: body.metaPurchaseEventId,
    initiateCheckoutEventId: body.metaInitiateCheckoutEventId,
    marketingConsent: Boolean(body.metaMarketingConsent),
    fbp: body.metaFbp,
    fbc: body.metaFbc,
  };
}

export function metaAttributionRequestBody(ctx: {
  purchaseEventId: string;
  initiateCheckoutEventId: string;
  marketingConsent: boolean;
  fbp?: string;
  fbc?: string;
}) {
  return {
    metaPurchaseEventId: ctx.purchaseEventId,
    metaInitiateCheckoutEventId: ctx.initiateCheckoutEventId,
    metaMarketingConsent: ctx.marketingConsent,
    metaFbp: ctx.fbp,
    metaFbc: ctx.fbc,
  };
}
