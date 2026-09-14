import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Server } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { TicketThread } from "@/components/TicketThread";
import { closeTicketAction, replyTicketAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/tickets/${id}`);

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: user.id },
    include: {
      service: { select: { id: true, label: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) notFound();

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;
  const closed = ticket.status === "CLOSED";

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

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold">{ticket.subject}</h1>
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="mono">{ticket.number}</span> ·{" "}
              {dict.ticketDepartments[ticket.department]} ·{" "}
              {formatDateTime(ticket.createdAt, locale)}
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
            href={`/${locale}/dashboard/services/${ticket.service.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--surface-sunken)" }}
          >
            <Server size={15} style={{ color: "var(--brand)" }} aria-hidden />
            <span className="font-semibold">{ticket.service.label}</span>
          </Link>
        )}
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
        youLabel={dict.tickets.you}
      />

      {closed ? (
        <Alert variant="info">{dict.tickets.closed}</Alert>
      ) : null}

      <form action={replyTicketAction} className="card flex flex-col gap-4 p-5">
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
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary">
            {closed ? dict.tickets.reopen : dict.tickets.sendReply}
          </button>
        </div>
      </form>

      {!closed && (
        <form action={closeTicketAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="ticketId" value={ticket.id} />
          <button type="submit" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}>
            {dict.tickets.close}
          </button>
        </form>
      )}
    </div>
  );
}
