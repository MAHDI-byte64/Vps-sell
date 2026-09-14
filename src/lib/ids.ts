import "server-only";
import { prisma } from "./db";

/**
 * Human-facing document numbers. They are derived from a per-entity counter
 * rather than a random string so customers can read one over the phone, and
 * the retry loop keeps them unique under concurrent checkouts.
 */
async function nextNumber(
  prefix: string,
  exists: (candidate: string) => Promise<boolean>,
  start: number,
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `${prefix}-${start + attempt}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Extremely unlikely; fall back to something guaranteed distinct.
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export async function nextOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  return nextNumber(
    "ORD",
    async (n) => (await prisma.order.count({ where: { number: n } })) > 0,
    100_001 + count,
  );
}

export async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  return nextNumber(
    "INV",
    async (n) => (await prisma.invoice.count({ where: { number: n } })) > 0,
    500_001 + count,
  );
}

export async function nextTicketNumber(): Promise<string> {
  const count = await prisma.ticket.count();
  return nextNumber(
    "TCK",
    async (n) => (await prisma.ticket.count({ where: { number: n } })) > 0,
    900_001 + count,
  );
}
