import "server-only";
import { cookies } from "next/headers";
import type { BillingCycle } from "@/lib/types";

export const CART_COOKIE = "vpssell_cart";
const MAX_ITEMS = 20;

export type CartItem = {
  planId: string;
  locationId: string;
  osId: string;
  cycle: BillingCycle;
  hostname?: string;
  quantity: number;
};

export type Cart = { items: CartItem[]; coupon?: string };

const EMPTY: Cart = { items: [] };

function parse(raw: string | undefined): Cart {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Cart;
    if (!Array.isArray(data.items)) return EMPTY;
    // Anything the visitor could have hand-edited in their cookie is clamped
    // here; ids are still re-validated against the database at checkout.
    const items = data.items.slice(0, MAX_ITEMS).flatMap((item): CartItem[] => {
      if (typeof item?.planId !== "string" || typeof item?.locationId !== "string") return [];
      if (typeof item?.osId !== "string") return [];
      const quantity = Math.min(Math.max(Number(item.quantity) || 1, 1), 10);
      return [
        {
          planId: item.planId,
          locationId: item.locationId,
          osId: item.osId,
          cycle: (item.cycle ?? "MONTHLY") as BillingCycle,
          hostname: typeof item.hostname === "string" ? item.hostname.slice(0, 120) : undefined,
          quantity,
        },
      ];
    });
    return { items, coupon: typeof data.coupon === "string" ? data.coupon : undefined };
  } catch {
    return EMPTY;
  }
}

export async function readCart(): Promise<Cart> {
  const store = await cookies();
  return parse(store.get(CART_COOKIE)?.value);
}

export async function writeCart(cart: Cart): Promise<void> {
  const store = await cookies();
  if (cart.items.length === 0 && !cart.coupon) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCart(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

export async function cartCount(): Promise<number> {
  const cart = await readCart();
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Two lines are the same product only when every configured option matches. */
export function sameConfiguration(a: CartItem, b: CartItem): boolean {
  return (
    a.planId === b.planId &&
    a.locationId === b.locationId &&
    a.osId === b.osId &&
    a.cycle === b.cycle &&
    (a.hostname ?? "") === (b.hostname ?? "")
  );
}
