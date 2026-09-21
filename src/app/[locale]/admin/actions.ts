"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sealSecret } from "@/lib/crypto";
import { settleInvoice, adjustWallet } from "@/lib/orders";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

/** Writes an audit row. Every state change an admin makes leaves a trace. */
async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, string | number | boolean | null>,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, meta: meta ?? undefined },
  });
}

// ----------------------------- service delivery ----------------------------

const deliverSchema = z.object({
  serviceId: z.string().min(1),
  ipv4: z
    .string()
    .trim()
    .regex(/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/)
    .or(z.literal("")),
  ipv6: z.string().trim().max(60).optional().or(z.literal("")),
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
  sshPort: z.coerce.number().int().min(1).max(65535),
  hostname: z.string().trim().max(120).optional().or(z.literal("")),
  adminNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * Hands a paid service over to the customer: stores the access details, seals
 * the password, and flips the service (and its order) to active.
 */
export async function deliverServiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);

  const parsed = deliverSchema.safeParse({
    serviceId: formData.get("serviceId"),
    ipv4: formData.get("ipv4") ?? "",
    ipv6: formData.get("ipv6") ?? "",
    username: formData.get("username"),
    password: formData.get("password"),
    sshPort: formData.get("sshPort") ?? 22,
    hostname: formData.get("hostname") ?? "",
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) {
    redirect(`/${locale}/admin/services/${formData.get("serviceId")}?error=invalid`);
  }

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
    include: { orderItem: true },
  });
  if (!service) redirect(`/${locale}/admin/services`);

  const startsAt = service.startsAt ?? new Date();

  await prisma.service.update({
    where: { id: service.id },
    data: {
      ipv4: parsed.data.ipv4 || null,
      ipv6: parsed.data.ipv6 || null,
      username: parsed.data.username,
      passwordEnc: sealSecret(parsed.data.password),
      sshPort: parsed.data.sshPort,
      hostname: parsed.data.hostname || service.hostname,
      adminNote: parsed.data.adminNote || null,
      status: "ACTIVE",
      startsAt,
    },
  });

  // Once every service on the order is delivered, the order itself is done.
  if (service.orderItem) {
    const orderId = service.orderItem.orderId;
    const remaining = await prisma.service.count({
      where: { orderItem: { orderId }, status: "PENDING" },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: remaining === 0 ? "COMPLETED" : "PROVISIONING" },
    });
  }

  // The plaintext password is never written to the audit trail.
  await audit(admin.id, "service.deliver", "Service", service.id, { ipv4: parsed.data.ipv4 });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/services/${service.id}?saved=1`);
}

const statusSchema = z.object({
  serviceId: z.string().min(1),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "TERMINATED"]),
});

export async function setServiceStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);

  const parsed = statusSchema.safeParse({
    serviceId: formData.get("serviceId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect(`/${locale}/admin/services`);

  await prisma.service.update({
    where: { id: parsed.data.serviceId },
    data: {
      status: parsed.data.status,
      suspendedAt: parsed.data.status === "SUSPENDED" ? new Date() : null,
    },
  });

  await audit(admin.id, "service.status", "Service", parsed.data.serviceId, {
    status: parsed.data.status,
  });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/services/${parsed.data.serviceId}?saved=1`);
}

// ------------------------------- payments ----------------------------------

/**
 * Confirms a bank transfer the customer claimed. This is the step that turns a
 * claimed payment into a settled invoice, which in turn creates the services.
 */
export async function confirmPaymentAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const paymentId = String(formData.get("paymentId") ?? "");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) redirect(`/${locale}/admin/payments`);
  if (payment.status !== "PENDING") redirect(`/${locale}/admin/payments`);

  const settled = await settleInvoice({
    invoiceId: payment.invoiceId,
    method: payment.method,
    reference: payment.reference ?? undefined,
    confirmedById: admin.id,
  });

  // settleInvoice writes its own SUCCESS payment row, so the claim this admin
  // just approved is closed out rather than left pending alongside it.
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: settled.ok ? "SUCCESS" : "FAILED",
      confirmedById: admin.id,
      confirmedAt: new Date(),
      failureReason: settled.ok ? null : settled.reason,
    },
  });

  await audit(admin.id, "payment.confirm", "Payment", payment.id, { ok: settled.ok });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/payments?done=1`);
}

export async function rejectPaymentAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 300);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") redirect(`/${locale}/admin/payments`);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      failureReason: reason || "rejected by admin",
      confirmedById: admin.id,
      confirmedAt: new Date(),
    },
  });

  await audit(admin.id, "payment.reject", "Payment", payment.id, { reason });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/payments?done=1`);
}

/** Books an invoice as paid without a customer-side payment (cash, goodwill). */
export async function markInvoicePaidAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const invoiceId = String(formData.get("invoiceId") ?? "");

  const settled = await settleInvoice({
    invoiceId,
    method: "MANUAL",
    reference: `MANUAL-${admin.id.slice(-6)}`,
    confirmedById: admin.id,
  });

  await audit(admin.id, "invoice.markPaid", "Invoice", invoiceId, { ok: settled.ok });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/invoices?done=1`);
}

// -------------------------------- users ------------------------------------

const walletSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().int().refine((value) => value !== 0),
  description: z.string().trim().max(200),
});

export async function adjustWalletAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);

  const parsed = walletSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) redirect(`/${locale}/admin/users`);

  await adjustWallet({
    userId: parsed.data.userId,
    amount: parsed.data.amount,
    type: "ADJUSTMENT",
    description: parsed.data.description || "اصلاح دستی توسط مدیر",
  });

  await audit(admin.id, "wallet.adjust", "User", parsed.data.userId, {
    amount: parsed.data.amount,
  });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/users/${parsed.data.userId}?saved=1`);
}

export async function toggleUserRoleAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const userId = String(formData.get("userId") ?? "");

  // An admin must not be able to demote themselves out of the panel.
  if (userId === admin.id) redirect(`/${locale}/admin/users/${userId}?error=self`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect(`/${locale}/admin/users`);

  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  await prisma.user.update({ where: { id: user.id }, data: { role: nextRole } });

  await audit(admin.id, "user.role", "User", user.id, { role: nextRole });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/users/${user.id}?saved=1`);
}

export async function toggleUserActiveAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const userId = String(formData.get("userId") ?? "");

  if (userId === admin.id) redirect(`/${locale}/admin/users/${userId}?error=self`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect(`/${locale}/admin/users`);

  await prisma.user.update({ where: { id: user.id }, data: { active: !user.active } });
  await audit(admin.id, "user.active", "User", user.id, { active: !user.active });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/users/${user.id}?saved=1`);
}

// ------------------------------- tickets -----------------------------------

export async function replyAdminTicketAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!body) redirect(`/${locale}/admin/tickets/${ticketId}`);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) redirect(`/${locale}/admin/tickets`);

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: admin.id, body, isStaff: true },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "ANSWERED", lastReplyAt: new Date() },
    }),
  ]);

  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/tickets/${ticket.id}`);
}

export async function setTicketStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["OPEN", "ANSWERED", "CUSTOMER_REPLY", "CLOSED"].includes(status)) {
    redirect(`/${locale}/admin/tickets`);
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: status as "OPEN" | "ANSWERED" | "CUSTOMER_REPLY" | "CLOSED" },
  });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/tickets/${ticketId}`);
}
