import {
  GetAccountCommand,
  GetEmailIdentityCommand,
  SESv2Client,
} from "@aws-sdk/client-sesv2";
import { awsSesRegion, fromDomainForHealth, parseFromHeader, sesCredentialsConfigured } from "@/lib/email/config";

export type SesHealthSnapshot = {
  configured: boolean;
  productionAccess: boolean | null;
  fromDomain: string | null;
  fromIdentityVerified: boolean | null;
  detail?: string;
  error?: string;
};

let healthClientFactory: (() => SESv2Client) | null = null;

function defaultHealthClient() {
  const region = awsSesRegion();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const credentials =
    accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
  return new SESv2Client({ region, credentials });
}

export function __setSesHealthClientForTests(factory: (() => SESv2Client) | null) {
  healthClientFactory = factory;
}

export async function fetchSesHealth(): Promise<SesHealthSnapshot> {
  const configured = sesCredentialsConfigured() && Boolean(process.env.EMAIL_FROM?.trim());
  const fromDomain = fromDomainForHealth();
  if (!configured) {
    return {
      configured: false,
      productionAccess: null,
      fromDomain,
      fromIdentityVerified: null,
      detail: "Set AWS SES credentials and EMAIL_FROM",
    };
  }

  try {
    const client = (healthClientFactory ?? defaultHealthClient)();
    const account = await client.send(new GetAccountCommand({}));
    const productionAccess = account.ProductionAccessEnabled ?? false;

    let fromIdentityVerified: boolean | null = null;
    const from = process.env.EMAIL_FROM!.trim();
    const { email } = parseFromHeader(from);
    const identity = email.includes("@") ? email.split("@")[1] : fromDomain;
    if (identity) {
      const id = await client.send(new GetEmailIdentityCommand({ EmailIdentity: identity }));
      fromIdentityVerified = id.VerifiedForSendingStatus ?? false;
    }

    const parts: string[] = [];
    parts.push(productionAccess ? "Production sending" : "SES sandbox (verify recipients or request production)");
    if (fromIdentityVerified === true) parts.push(`Domain ${identity} verified`);
    else if (fromIdentityVerified === false) parts.push(`Domain ${identity} not verified for sending`);

    return {
      configured: true,
      productionAccess,
      fromDomain: identity ?? fromDomain,
      fromIdentityVerified,
      detail: parts.join(" · "),
    };
  } catch (error) {
    return {
      configured: true,
      productionAccess: null,
      fromDomain,
      fromIdentityVerified: null,
      error: error instanceof Error ? error.message : "SES health check failed",
    };
  }
}
