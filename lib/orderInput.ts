import { z } from "zod";
import { DIGITAL_SUPPLY_CONSENT_LABEL, PHOTO_CONSENT_LABEL } from "@/config/brand";
import { utmSchema } from "@/lib/http";

const orderBodySchema = z.object({
  themeId: z.string().min(1),
  subjectType: z.enum(["pet", "family", "couple", "me"]),
  tierId: z.enum(["mini", "classic", "deluxe", "hand_painted_12x16", "hand_painted_16x20"]),
  styleIds: z.array(z.string()).min(1).max(12),
  cardNames: z.string().max(80).optional(),
  email: z.string().email("Enter a valid email"),
  photoConsent: z.boolean().optional(),
  /** @deprecated Use photoConsent */
  consent: z.boolean().optional(),
  digitalSupplyConsent: z.boolean(),
  priority: z.boolean(),
  offer: z.enum(["one_off", "season_pass"]).optional(),
  referralCode: z.string().max(40).optional(),
  utm: utmSchema.optional(),
  physicalLines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .max(24)
    .optional(),
});

export const orderInputSchema = orderBodySchema.superRefine((data, ctx) => {
  if (!data.photoConsent && !data.consent) {
    ctx.addIssue({ code: "custom", message: PHOTO_CONSENT_LABEL, path: ["photoConsent"] });
  }
  if (!data.digitalSupplyConsent) {
    ctx.addIssue({ code: "custom", message: DIGITAL_SUPPLY_CONSENT_LABEL, path: ["digitalSupplyConsent"] });
  }
});

export type OrderInput = z.infer<typeof orderBodySchema>;

export function photoConsentGiven(input: OrderInput) {
  return Boolean(input.photoConsent || input.consent);
}
