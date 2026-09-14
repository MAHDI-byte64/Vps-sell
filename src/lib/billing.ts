import type { BillingCycle } from "@/lib/types";

/** How many months each cycle covers, and the default discount it carries. */
export const CYCLES: Record<BillingCycle, { months: number; defaultDiscountPct: number }> = {
  MONTHLY: { months: 1, defaultDiscountPct: 0 },
  QUARTERLY: { months: 3, defaultDiscountPct: 5 },
  SEMIANNUAL: { months: 6, defaultDiscountPct: 10 },
  ANNUAL: { months: 12, defaultDiscountPct: 20 },
};

export const CYCLE_ORDER: BillingCycle[] = ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"];

export type CycleDiscounts = Record<BillingCycle, number>;

export function defaultCycleDiscounts(): CycleDiscounts {
  return {
    MONTHLY: CYCLES.MONTHLY.defaultDiscountPct,
    QUARTERLY: CYCLES.QUARTERLY.defaultDiscountPct,
    SEMIANNUAL: CYCLES.SEMIANNUAL.defaultDiscountPct,
    ANNUAL: CYCLES.ANNUAL.defaultDiscountPct,
  };
}

/**
 * Price for one unit across a whole billing cycle, rounded to a clean
 * 1,000-Toman step so invoices never show odd trailing digits.
 */
export function priceForCycle(
  monthlyPrice: number,
  cycle: BillingCycle,
  discounts: CycleDiscounts,
): number {
  const { months } = CYCLES[cycle];
  const pct = Math.min(Math.max(discounts[cycle] ?? 0, 0), 90);
  const gross = monthlyPrice * months;
  const net = gross * (1 - pct / 100);
  return Math.round(net / 1000) * 1000;
}

/** The saving a cycle delivers versus paying month by month. */
export function cycleSaving(
  monthlyPrice: number,
  cycle: BillingCycle,
  discounts: CycleDiscounts,
): number {
  return monthlyPrice * CYCLES[cycle].months - priceForCycle(monthlyPrice, cycle, discounts);
}

export function addCycle(from: Date, cycle: BillingCycle): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + CYCLES[cycle].months);
  return next;
}
