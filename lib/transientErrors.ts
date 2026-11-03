export function isTransientError(error: unknown) {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) parts.push(error.cause.message);
  } else {
    parts.push(String(error));
  }
  const text = parts.join(" ");
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|502|503|504|socket hang up|network/i.test(text);
}

export async function withTransientRetries<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delaysMs?: number[] } = {},
) {
  const attempts = options.attempts ?? 4;
  const delaysMs = options.delaysMs ?? [0, 1500, 4000, 10_000];
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    const delay = delaysMs[i] ?? delaysMs[delaysMs.length - 1] ?? 0;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isTransientError(error) || i === attempts - 1) throw error;
    }
  }
  throw last;
}
