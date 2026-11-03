/** postgres.js tagged templates reject JS Date in some Node/Next builds — use ISO strings. */
export function pgTimestamptz(value: Date | string | number) {
  return new Date(value).toISOString();
}
