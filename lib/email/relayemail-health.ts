import { emailProviderId } from "@/lib/email/config";

export type RelayEmailHealthSnapshot = {
  configured: boolean;
  provider: "relayemail" | "other";
  detail?: string;
};

export function relayEmailConfigured() {
  return Boolean(process.env.RELAYEMAIL_API_KEY?.trim());
}

export function fetchRelayEmailHealth(): RelayEmailHealthSnapshot {
  const provider = emailProviderId();
  if (provider !== "relayemail") {
    return {
      configured: relayEmailConfigured(),
      provider: "other",
      detail: provider === "none" ? "Set EMAIL_PROVIDER=relayemail" : `Active provider: ${provider}`,
    };
  }
  if (!relayEmailConfigured()) {
    return {
      configured: false,
      provider: "relayemail",
      detail: "Set RELAYEMAIL_API_KEY (value not shown)",
    };
  }
  return {
    configured: true,
    provider: "relayemail",
    detail: "Relay Email API key configured · bounces handled by Relay",
  };
}
