import { createHash } from "crypto";

export function hashMetaEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

export function hashMetaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("44") ? digits : digits.startsWith("0") ? `44${digits.slice(1)}` : `44${digits}`;
  return createHash("sha256").update(normalized).digest("hex");
}
