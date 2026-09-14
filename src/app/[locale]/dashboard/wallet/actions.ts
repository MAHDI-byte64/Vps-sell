"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createStandaloneInvoice } from "@/lib/orders";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { MAX_TOPUP, MIN_TOPUP } from "@/lib/constants";

const schema = z.object({
  amount: z.coerce.number().int().min(MIN_TOPUP).max(MAX_TOPUP),
});

/**
 * A top-up is an invoice like any other. The balance only moves when that
 * invoice is settled, which keeps every credit backed by a payment record.
 */
export async function topUpAction(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = schema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) redirect(`/${locale}/dashboard/wallet?error=amount`);

  const invoice = await createStandaloneInvoice({
    userId: user.id,
    type: "WALLET_TOPUP",
    total: parsed.data.amount,
    description: "شارژ کیف پول",
  });

  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/invoices/${invoice.id}`);
}
