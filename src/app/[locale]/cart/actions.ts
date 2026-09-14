"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCart, writeCart } from "@/lib/cart";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

export async function removeLineAction(formData: FormData) {
  const locale = localeOf(formData);
  const index = Number(formData.get("index"));
  const cart = await readCart();
  if (Number.isInteger(index) && index >= 0 && index < cart.items.length) {
    cart.items.splice(index, 1);
    // An empty cart should not keep holding a coupon.
    if (cart.items.length === 0) cart.coupon = undefined;
    await writeCart(cart);
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/cart`);
}

export async function setQuantityAction(formData: FormData) {
  const locale = localeOf(formData);
  const index = Number(formData.get("index"));
  const quantity = Number(formData.get("quantity"));
  const cart = await readCart();
  if (Number.isInteger(index) && index >= 0 && index < cart.items.length) {
    cart.items[index].quantity = Math.min(Math.max(quantity || 1, 1), 10);
    await writeCart(cart);
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/cart`);
}

export async function applyCouponAction(formData: FormData) {
  const locale = localeOf(formData);
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const cart = await readCart();
  // The code is only stored here; whether it is valid is decided at pricing
  // time so the cart can explain a rejection instead of silently dropping it.
  cart.coupon = code || undefined;
  await writeCart(cart);
  redirect(`/${locale}/cart`);
}

export async function removeCouponAction(formData: FormData) {
  const locale = localeOf(formData);
  const cart = await readCart();
  cart.coupon = undefined;
  await writeCart(cart);
  redirect(`/${locale}/cart`);
}
