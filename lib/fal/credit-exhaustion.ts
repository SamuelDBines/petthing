import { FalProviderError, parseFalErrorDetail } from "@/lib/fal/provider-errors";

/** Matches fal.ai billing / credit lock messages (HTTP body or thrown detail). */
export const FAL_CREDIT_MESSAGE =
  /balance|billing|credit|exhausted|insufficient|locked|top_up|top-up|payment required|out of credit/i;

export function isFalCreditExhaustedHttp(status: number, detail: string) {
  const text = detail.trim();
  if (status === 402) return true;
  if (status === 403 && FAL_CREDIT_MESSAGE.test(text)) return true;
  if ((status === 402 || status === 403 || status === 429) && FAL_CREDIT_MESSAGE.test(text)) return true;
  return false;
}

export function isFalCreditExhaustedError(error: unknown) {
  if (error instanceof FalProviderError) {
    return isFalCreditExhaustedHttp(error.status, error.detail);
  }
  if (error instanceof Error && FAL_CREDIT_MESSAGE.test(error.message)) return true;
  return false;
}
