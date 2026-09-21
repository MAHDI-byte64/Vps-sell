/**
 * Environment access with fail-fast validation.
 *
 * Anything that would silently weaken security if missing (the two secrets)
 * is rejected at boot in production rather than defaulted, so a misconfigured
 * deploy fails loudly instead of signing cookies with a guessable key.
 */
const isProd = process.env.NODE_ENV === "production";

function required(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (!isProd && devFallback) return devFallback;
  throw new Error(
    `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
  );
}

function secret(name: string, devFallback: string): string {
  const value = required(name, devFallback);
  if (isProd && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production.`);
  }
  return value;
}

export const env = {
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://vpssell:vpssell_dev_password@localhost:5432/vpssell?schema=public",
  ),
  authSecret: secret("AUTH_SECRET", "dev-only-auth-secret-not-for-production-use"),
  credentialSecret: secret(
    "CREDENTIAL_SECRET",
    "dev-only-credential-secret-not-for-production",
  ),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  isProd,
  // Optional: only the supplier-sync admin page needs this. Its absence
  // disables that feature rather than failing the whole app to build/boot.
  radibApiToken: process.env.RADIB_API_TOKEN ?? null,
};
