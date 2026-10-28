export function prodigiApiKey() {
  return process.env.PRODIGI_API_KEY?.trim() || process.env.PRODIGI_SANDBOX_API_KEY?.trim() || "";
}
