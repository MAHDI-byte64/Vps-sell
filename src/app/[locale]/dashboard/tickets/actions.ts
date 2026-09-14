"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { nextTicketNumber } from "@/lib/ids";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

const createSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  department: z.enum(["SALES", "TECHNICAL", "BILLING"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  serviceId: z.string().optional().or(z.literal("")),
  body: z.string().trim().min(5).max(5000),
});

export async function createTicketAction(formData: FormData) {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = createSchema.safeParse({
    subject: formData.get("subject"),
    department: formData.get("department"),
    priority: formData.get("priority"),
    serviceId: formData.get("serviceId") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/tickets/new?error=invalid`);

  // A ticket may only be attached to a service the customer actually owns.
  let serviceId: string | null = null;
  if (parsed.data.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: parsed.data.serviceId, userId: user.id },
      select: { id: true },
    });
    serviceId = service?.id ?? null;
  }

  const ticket = await prisma.ticket.create({
    data: {
      number: await nextTicketNumber(),
      userId: user.id,
      serviceId,
      subject: parsed.data.subject,
      department: parsed.data.department,
      priority: parsed.data.priority,
      status: "OPEN",
      messages: {
        create: { authorId: user.id, body: parsed.data.body, isStaff: false },
      },
    },
  });

  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/tickets/${ticket.id}`);
}

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

export async function replyTicketAction(formData: FormData) {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/tickets`);

  const ticket = await prisma.ticket.findFirst({
    where: { id: parsed.data.ticketId, userId: user.id },
  });
  if (!ticket) redirect(`/${locale}/dashboard/tickets`);

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, body: parsed.data.body, isStaff: false },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      // A customer reply always puts the ticket back in the support queue,
      // including reopening one that had been closed.
      data: { status: "CUSTOMER_REPLY", lastReplyAt: new Date() },
    }),
  ]);

  revalidatePath(`/${locale}/dashboard/tickets/${ticket.id}`);
  redirect(`/${locale}/dashboard/tickets/${ticket.id}`);
}

export async function closeTicketAction(formData: FormData) {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const ticketId = String(formData.get("ticketId") ?? "");
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket) redirect(`/${locale}/dashboard/tickets`);

  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "CLOSED" } });
  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/tickets/${ticket.id}`);
}
