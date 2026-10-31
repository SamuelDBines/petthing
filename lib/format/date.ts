const LONDON = "Europe/London";

/** Stable en-GB copy for SSR (avoids locale/timezone hydration drift). */
export function formatLondonDate(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: LONDON, ...options });
}
