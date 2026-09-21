"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createStandaloneInvoice } from "@/lib/orders";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Issues a renewal invoice for a service. Paying it extends the expiry — see
 * `settleInvoice`, which is the only place an expiry actually moves.
 */
export async function renewServiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const serviceId = String(formData.get("serviceId") ?? "");

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId: user.id },
  });
  if (!service) redirect(`/${locale}/dashboard/services`);
  if (service.status === "TERMINATED") {
    redirect(`/${locale}/dashboard/services/${service.id}?error=terminated`);
  }

  // Never stack two unpaid renewals on the same service.
  if (service.renewalInvoiceId) {
    const pending = await prisma.invoice.findUnique({ where: { id: service.renewalInvoiceId } });
    if (pending && pending.status === "UNPAID") {
      redirect(`/${locale}/dashboard/invoices/${pending.id}`);
    }
  }

  const invoice = await createStandaloneInvoice({
    userId: user.id,
    type: "RENEWAL",
    total: service.price,
    description: `تمدید سرویس ${service.label}`,
  });

  await prisma.service.update({
    where: { id: service.id },
    data: { renewalInvoiceId: invoice.id },
  });

  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/invoices/${invoice.id}`);
}

export async function toggleAutoRenewAction(formData: FormData) {
  const locale = localeOf(formData);
  const serviceId = String(formData.get("serviceId") ?? "");

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const service = await prisma.service.findFirst({ where: { id: serviceId, userId: user.id } });
  if (!service) redirect(`/${locale}/dashboard/services`);

  await prisma.service.update({
    where: { id: service.id },
    data: { autoRenew: !service.autoRenew },
  });

  revalidatePath(`/${locale}/dashboard/services/${service.id}`);
  redirect(`/${locale}/dashboard/services/${service.id}`);
}
