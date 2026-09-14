"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { readCart, clearCart } from "@/lib/cart";
import { priceCart } from "@/lib/pricing";
import { createOrderWithInvoice, settleInvoice } from "@/lib/orders";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

const schema = z.object({
  method: z.enum(["WALLET", "GATEWAY", "CARD_TRANSFER"]),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function placeOrderAction(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout`)}`);

  const parsed = schema.safeParse({
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) redirect(`/${locale}/checkout?error=invalid`);

  const settings = await getSettings();
  const cart = await readCart();
  // Re-price against the live catalogue: the cart page may have been open for
  // a while, and the cookie carries no prices of its own.
  const priced = await priceCart(cart, settings.cycleDiscounts, settings.taxPercent, user.id);
  if (priced.lines.length === 0) redirect(`/${locale}/cart`);

  const { method, reference, note } = parsed.data;

  if (method === "WALLET" && user.walletBalance < priced.total) {
    redirect(`/${locale}/checkout?error=balance`);
  }

  const { order, invoice } = await createOrderWithInvoice({ userId: user.id, priced, note: note || undefined });
  await clearCart();

  if (method === "CARD_TRANSFER") {
    // The money has not arrived yet: record the claim and let an admin confirm.
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        method: "CARD_TRANSFER",
        status: "PENDING",
        amount: invoice.total,
        reference: reference || null,
        receiptNote: note || null,
      },
    });
    revalidatePath(`/${locale}`, "layout");
    redirect(`/${locale}/dashboard/invoices/${invoice.id}?submitted=1`);
  }

  // WALLET and the simulated GATEWAY both settle immediately.
  const settled = await settleInvoice({
    invoiceId: invoice.id,
    method,
    reference: method === "GATEWAY" ? `SIM-${order.number}` : undefined,
  });

  if (!settled.ok && settled.reason === "insufficient") {
    redirect(`/${locale}/dashboard/invoices/${invoice.id}?error=balance`);
  }

  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/dashboard/invoices/${invoice.id}?paid=1`);
}
