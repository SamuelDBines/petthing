import assert from "node:assert/strict";
import test from "node:test";
import { allowedAdminEmails, isAllowedAdminEmail } from "../lib/admin/allowlist";
import { googleOAuthRedirectUri } from "../auth";

test("allowedAdminEmails defaults include owner address", () => {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.ADMIN_ALLOWED_EMAILS;
  delete env.ADMIN_ALLOWED_EMAILS;
  assert.ok(allowedAdminEmails().includes("samuelbines@gmail.com"));
  env.ADMIN_ALLOWED_EMAILS = prev;
});

test("isAllowedAdminEmail is case insensitive", () => {
  const env = process.env as Record<string, string | undefined>;
  env.ADMIN_ALLOWED_EMAILS = "Admin@Example.com";
  assert.equal(isAllowedAdminEmail("admin@example.com"), true);
});

test("googleOAuthRedirectUri uses ADMIN_URL", () => {
  const env = process.env as Record<string, string | undefined>;
  const prevAdmin = env.ADMIN_URL;
  const prevAuth = env.AUTH_URL;
  env.ADMIN_URL = "https://dropship.store.bishop-co-tech.co.uk";
  delete env.AUTH_URL;
  assert.equal(googleOAuthRedirectUri(), "https://dropship.store.bishop-co-tech.co.uk/api/auth/callback/google");
  env.ADMIN_URL = prevAdmin;
  env.AUTH_URL = prevAuth;
});
