"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { clearCart } from "@/lib/cart";
import { defaultLocale } from "@/i18n/config";

export async function logoutAction() {
  await destroySession();
  // The cart belongs to the browser session, not the account — drop it too so a
  // shared machine does not hand the next person a half-filled basket.
  await clearCart();
  redirect(`/${defaultLocale}`);
}
