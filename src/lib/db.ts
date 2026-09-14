import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * A single PrismaClient per process. Next.js hot-reloads modules in dev, so the
 * instance is parked on globalThis to avoid exhausting the connection pool
 * across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.databaseUrl }),
    log: env.isProd ? ["error"] : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (!env.isProd) globalForPrisma.prisma = prisma;
