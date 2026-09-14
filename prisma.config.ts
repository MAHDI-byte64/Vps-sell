import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env implicitly, so pull it in before the config is
// read — otherwise `prisma migrate` / `db push` cannot see DATABASE_URL.
process.loadEnvFile?.(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
