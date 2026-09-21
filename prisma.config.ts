import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env implicitly, so pull it in before the config is
// read — otherwise `prisma migrate` / `db push` cannot see DATABASE_URL.
// Load .env when there is one. In Docker there is not — the values arrive as
// real environment variables — and loadEnvFile throws on a missing file.
try {
  process.loadEnvFile?.(".env");
} catch {
  // no .env; rely on the ambient environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
