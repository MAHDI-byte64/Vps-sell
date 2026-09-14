import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Server } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { TicketThread } from "@/components/TicketThread";
import { replyAdminTicketAction, setTicketStatusAction } from "../../actions";
import type { TicketStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: TicketStatus[] = ["OPEN", "ANSWERED", "CLOSED"];

export default async function AdminTicketDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, label: true, ipv4: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) notFound();

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/admin/tickets`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.admin.tickets}
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold">{ticket.subject}</h1>
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="mono">{ticket.number}</span> ·{" "}
              {dict.ticketDepartments[ticket.department]} ·{" "}
              {formatDateTime(ticket.createdAt, locale)}
            </p>
            <p className="mt-2 text-sm">
              <Link href={`/${locale}/admin/users/${ticket.user.id}`} className="link font-semibold">
                {ticket.user.name}
              </Link>
              <span className="ltr-text ms-2 text-xs" style={{ color: "var(--text-faint)" }}>
                {ticket.user.email}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone[ticket.priority]}>
              {dict.ticketPriorities[ticket.priority]}
            </Badge>
            <Badge tone={statusTone[ticket.status]}>{dict.ticketStatus[ticket.status]}</Badge>
          </div>
        </div>

        {ticket.service && (
          <Link
            href={`/${locale}/admin/services/${ticket.service.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--surface-sunken)" }}
          >
            <Server size={15} style={{ color: "var(--brand)" }} aria-hidden />
            <span className="font-semibold">{ticket.service.label}</span>
            {ticket.service.ipv4 && (
              <span className="mono text-xs" style={{ color: "var(--text-faint)" }}>
                {ticket.service.ipv4}
              </span>
            )}
          </Link>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          {STATUSES.filter((value) => value !== ticket.status).map((value) => (
            <form key={value} action={setTicketStatusAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input type="hidden" name="status" value={value} />
              <button type="submit" className="btn btn-outline btn-sm">
                {dict.ticketStatus[value]}
              </button>
            </form>
          ))}
        </div>
      </header>

      <TicketThread
        messages={ticket.messages.map((message) => ({
          id: message.id,
          body: message.body,
          isStaff: message.isStaff,
          authorName: message.author.name,
          createdAt: formatDateTime(message.createdAt, locale),
        }))}
        staffLabel={dict.tickets.staff}
        youLabel={ticket.user.name}
      />

      <form action={replyAdminTicketAction} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="ticketId" value={ticket.id} />
        <div>
          <label className="label" htmlFor="body">
            {dict.tickets.reply}
          </label>
          <textarea
            id="body"
            name="body"
            className="textarea"
            required
            maxLength={5000}
            placeholder={dict.tickets.replyPlaceholder}
          />
        </div>
        <button type="submit" className="btn btn-primary self-start">
          {dict.tickets.sendReply}
        </button>
      </form>
    </div>
  );
}
