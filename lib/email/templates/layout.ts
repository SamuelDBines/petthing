import { BISHOP_CO_FOOTER_LINE } from "@/lib/email/templates/constants";
import type { StoreBrand } from "@/lib/tenant/types";

export type EmailLayoutOptions = {
  brand: StoreBrand;
  origin: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  unsubscribeUrl?: string;
};

function logoUrl(origin: string, logoPath: string) {
  return `${origin.replace(/\/$/, "")}${logoPath.startsWith("/") ? logoPath : `/${logoPath}`}`;
}

export function renderBrandedEmailHtml(options: EmailLayoutOptions) {
  const { brand, origin, preheader, title, bodyHtml, cta, unsubscribeUrl } = options;
  const accent = brand.colors.pumpkin;
  const bg = brand.colors.bark;
  const text = brand.colors.cream;
  const muted = brand.colors.muted;
  const logoBg = "#f3efe8";
  const logo = logoUrl(origin, brand.logoPath);

  const ctaBlock = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0 auto;">
  <tr>
    <td align="center" bgcolor="${accent}" style="border-radius:999px;">
      <a href="${cta.href}" style="display:inline-block;padding:14px 28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${cta.label}</a>
    </td>
  </tr>
</table>`
    : "";

  const unsub = unsubscribeUrl
    ? `<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:${muted};"><a href="${unsubscribeUrl}" style="color:${muted};">Unsubscribe</a> from marketing emails.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1c1916 !important; }
      .email-card { background-color: #2a2622 !important; }
      .email-text { color: #f3efe8 !important; }
      .email-muted { color: #c4b9ac !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:${bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;" class="email-card">
          <tr>
            <td style="padding:24px 28px;background-color:#ffffff;border-radius:16px 16px 0 0;border:1px solid ${brand.colors.line};border-bottom:none;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${logoBg};border-radius:12px;padding:8px;">
                    <img src="${logo}" alt="${escapeHtml(brand.appName)}" width="120" height="40" style="display:block;height:40px;width:auto;max-width:160px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-text" style="padding:8px 28px 32px 28px;background-color:#ffffff;border:1px solid ${brand.colors.line};border-top:none;border-radius:0 0 16px 16px;font-family:Georgia,'Times New Roman',serif;color:${text};font-size:16px;line-height:26px;">
              ${bodyHtml}
              ${ctaBlock}
              <hr style="border:none;border-top:1px solid ${brand.colors.line};margin:32px 0 20px 0;" />
              <p class="email-muted" style="margin:0;font-size:13px;line-height:20px;color:${muted};">
                Questions? <a href="mailto:${brand.supportEmail}" style="color:${accent};">${brand.supportEmail}</a>
                · <a href="${origin}/support" style="color:${accent};">Help centre</a>
              </p>
              <p class="email-muted" style="margin:12px 0 0 0;font-size:11px;line-height:17px;color:${muted};">${BISHOP_CO_FOOTER_LINE}</p>
              ${unsub}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderBrandedEmailText(options: EmailLayoutOptions) {
  const { brand, origin, title, bodyHtml, cta, unsubscribeUrl } = options;
  const plainBody = stripTags(bodyHtml);
  const lines = [title, "", plainBody];
  if (cta) lines.push("", `${cta.label}: ${cta.href}`);
  lines.push("", `Support: ${brand.supportEmail}`, `${origin}/support`, "", BISHOP_CO_FOOTER_LINE);
  if (unsubscribeUrl) lines.push("", `Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
