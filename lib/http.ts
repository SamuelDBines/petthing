import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; response: Response } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, response: jsonError(parsed.error.issues[0]?.message || "Invalid request") };
  }
  return { ok: true, data: parsed.data };
}

export const utmSchema = z
  .object({
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    ref: z.string().max(40).optional(),
    gclid: z.string().max(200).optional(),
    fbclid: z.string().max(200).optional(),
    ttclid: z.string().max(200).optional(),
  })
  .partial();

export function cleanUtm(input: z.infer<typeof utmSchema> | undefined) {
  const utm: Record<string, string> = {};
  if (!input) return utm;
  for (const [key, value] of Object.entries(input)) {
    if (value) utm[key] = value;
  }
  return utm;
}

export function sniffImage(bytes: Buffer) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
