const CHECKOUT_FALLBACK = "Payment could not start. Please try again in a moment.";

export async function parseCheckoutResponse(response: Response): Promise<{
  ok: boolean;
  body: { url?: string; error?: string };
}> {
  const text = await response.text();
  if (!text.trim()) {
    return { ok: false, body: { error: CHECKOUT_FALLBACK } };
  }
  try {
    const body = JSON.parse(text) as { url?: string; error?: string };
    if (!response.ok && !body.error) {
      return { ok: false, body: { error: CHECKOUT_FALLBACK } };
    }
    return { ok: response.ok, body };
  } catch {
    return { ok: false, body: { error: CHECKOUT_FALLBACK } };
  }
}

export function checkoutErrorMessage(body: { error?: string }, ok: boolean) {
  if (ok) return "";
  return body.error || CHECKOUT_FALLBACK;
}
