import "server-only";
import { prisma } from "./db";
import { priceForCycle, type CycleDiscounts } from "./billing";
import type { Cart, CartItem } from "./cart";
import type { Coupon, Location, OperatingSystem, Plan } from "./types";

export type PricedLine = {
  item: CartItem;
  plan: Plan;
  location: Location;
  os: OperatingSystem;
  unitPrice: number;
  setupFee: number;
  lineTotal: number;
};

export type CouponProblem =
  | "not_found"
  | "inactive"
  | "expired"
  | "not_started"
  | "exhausted"
  | "already_used"
  | "min_order"
  | "first_order_only";

export type PricedCart = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon: Coupon | null;
  couponProblem: CouponProblem | null;
};

/**
 * Turns a cookie cart into priced lines.
 *
 * Every figure is recomputed from the catalogue here — the cookie only carries
 * *what* was chosen, never *what it costs* — so a tampered cookie cannot change
 * a price. Lines whose plan, location or OS no longer exists are dropped.
 */
export async function priceCart(
  cart: Cart,
  discounts: CycleDiscounts,
  taxPercent: number,
  userId?: string,
): Promise<PricedCart> {
  if (cart.items.length === 0) {
    return {
      lines: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      coupon: null,
      couponProblem: null,
    };
  }

  const [plans, locations, operatingSystems] = await Promise.all([
    prisma.plan.findMany({
      where: { id: { in: cart.items.map((item) => item.planId) }, active: true },
    }),
    prisma.location.findMany({
      where: { id: { in: cart.items.map((item) => item.locationId) }, active: true },
    }),
    prisma.operatingSystem.findMany({
      where: { id: { in: cart.items.map((item) => item.osId) }, active: true },
    }),
  ]);

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const osById = new Map(operatingSystems.map((os) => [os.id, os]));

  const lines: PricedLine[] = [];
  for (const item of cart.items) {
    const plan = planById.get(item.planId);
    const location = locationById.get(item.locationId);
    const os = osById.get(item.osId);
    if (!plan || !location || !os) continue;

    const unitPrice = priceForCycle(plan.priceMonthly, item.cycle, discounts);
    const setupFee = plan.setupFee * item.quantity;
    lines.push({
      item,
      plan,
      location,
      os,
      unitPrice,
      setupFee,
      lineTotal: unitPrice * item.quantity + setupFee,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  let coupon: Coupon | null = null;
  let couponProblem: CouponProblem | null = null;
  let discount = 0;

  if (cart.coupon && subtotal > 0) {
    const result = await evaluateCoupon(cart.coupon, subtotal, userId);
    coupon = result.coupon;
    couponProblem = result.problem;
    discount = result.discount;
  }

  const taxable = Math.max(subtotal - discount, 0);
  const tax = Math.round((taxable * taxPercent) / 100);

  return { lines, subtotal, discount, tax, total: taxable + tax, coupon, couponProblem };
}

/**
 * Checks a coupon against every rule it carries and returns the amount it is
 * worth on this subtotal. Returning the reason (rather than just null) lets the
 * cart tell the customer *why* a code was rejected.
 */
export async function evaluateCoupon(
  code: string,
  subtotal: number,
  userId?: string,
): Promise<{ coupon: Coupon | null; problem: CouponProblem | null; discount: number }> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return { coupon: null, problem: "not_found", discount: 0 };

  const fail = (problem: CouponProblem) => ({ coupon, problem, discount: 0 });

  if (!coupon.active) return fail("inactive");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return fail("not_started");
  if (coupon.expiresAt && coupon.expiresAt < now) return fail("expired");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return fail("exhausted");
  if (coupon.minOrder !== null && subtotal < coupon.minOrder) return fail("min_order");

  if (userId) {
    const usedByUser = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (usedByUser >= coupon.maxUsesPerUser) return fail("already_used");

    if (coupon.firstOrderOnly) {
      const paidOrders = await prisma.order.count({
        where: { userId, status: { in: ["PAID", "PROVISIONING", "COMPLETED"] } },
      });
      if (paidOrders > 0) return fail("first_order_only");
    }
  }

  const raw =
    coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.maxDiscount !== null ? Math.min(raw, coupon.maxDiscount) : raw;
  // A coupon can never make an order negative.
  return { coupon, problem: null, discount: Math.min(capped, subtotal) };
}
