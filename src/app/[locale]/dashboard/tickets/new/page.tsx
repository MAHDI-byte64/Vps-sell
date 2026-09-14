import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Alert } from "@/components/ui/Alert";
import { createTicketAction } from "../actions";
import type { TicketDepartment, TicketPriority } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEPARTMENTS: TicketDepartment[] = ["TECHNICAL", "SALES", "BILLING"];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default async function NewTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const { service: preselected, error } = await searchParams;

  const user = await requireUser(locale, `/${locale}/dashboard/tickets/new`);
  const services = await prisma.service.findMany({
    where: { userId: user.id, status: { not: "TERMINATED" } },
    select: { id: true, label: true, ipv4: true },
    orderBy: { createdAt: "desc" },
  });

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/tickets`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.tickets.title}
      </Link>

      <h1 className="text-xl font-extrabold">{dict.tickets.new}</h1>

      {error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <form action={createTicketAction} className="card flex flex-col gap-4 p-6">
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label className="label" htmlFor="subject">
            {dict.tickets.subject}
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            className="input"
            required
            minLength={3}
            maxLength={150}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="department">
              {dict.tickets.department}
            </label>
            <select id="department" name="department" className="select" defaultValue="TECHNICAL">
              {DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {dict.ticketDepartments[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="priority">
              {dict.tickets.priority}
            </label>
            <select id="priority" name="priority" className="select" defaultValue="NORMAL">
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {dict.ticketPriorities[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="serviceId">
            {dict.tickets.relatedService}
          </label>
          <select
            id="serviceId"
            name="serviceId"
            className="select"
            defaultValue={preselected ?? ""}
          >
            <option value="">{dict.tickets.noService}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
                {service.ipv4 ? ` — ${service.ipv4}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="body">
            {dict.tickets.message}
          </label>
          <textarea
            id="body"
            name="body"
            className="textarea"
            required
            minLength={5}
            maxLength={5000}
            placeholder={dict.tickets.messagePlaceholder}
          />
        </div>

        <button type="submit" className="btn btn-primary mt-1 self-start">
          {dict.tickets.send}
        </button>
      </form>
    </div>
  );
}
