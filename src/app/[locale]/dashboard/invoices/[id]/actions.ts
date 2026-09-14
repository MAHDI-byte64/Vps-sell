"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { settleInvoice } from "@/lib/orders";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

const schema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["WALLET", "GATEWAY", "CARD_TRANSFER"]),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function payInvoiceAction(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = schema.safeParse({
    invoiceId: formData.get("invoiceId"),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/invoices`);

  // Scoped by userId so an invoice id from another account is simply not found.
  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, userId: user.id },
  });
  if (!invoice) redirect(`/${locale}/dashboard/invoices`);
  if (invoice.status !== "UNPAID") redirect(`/${locale}/dashboard/invoices/${invoice.id}`);

  if (parsed.data.method === "CARD_TRANSFER") {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        method: "CARD_TRANSFER",
        status: "PENDING",
        amount: invoice.total,
        reference: parsed.data.reference || null,
      },
    });
    revalidatePath(`/${locale}/dashboard`, "layout");
    redirect(`/${locale}/dashboard/invoices/${invoice.id}?submitted=1`);
  }

  const settled = await settleInvoice({
    invoiceId: invoice.id,
    method: parsed.data.method,
    reference: parsed.data.method === "GATEWAY" ? `SIM-${invoice.number}` : undefined,
  });

  if (!settled.ok && settled.reason === "insufficient") {
    redirect(`/${locale}/dashboard/invoices/${invoice.id}?error=balance`);
  }

  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/invoices/${invoice.id}?paid=1`);
}
