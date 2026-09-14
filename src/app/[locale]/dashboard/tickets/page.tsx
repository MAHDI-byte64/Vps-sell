import Link from "next/link";
import { notFound } from "next/navigation";
import { LifeBuoy, Plus } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function TicketsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/tickets`);

  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    orderBy: { lastReplyAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{dict.tickets.title}</h1>
        <Link href={`/${locale}/dashboard/tickets/new`} className="btn btn-primary btn-sm">
          <Plus size={15} aria-hidden />
          {dict.tickets.new}
        </Link>
      </header>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={26} />}
          title={dict.tickets.empty}
          action={
            <Link href={`/${locale}/dashboard/tickets/new`} className="btn btn-primary btn-sm">
              {dict.tickets.new}
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.tickets.number}</th>
                <th>{dict.tickets.subject}</th>
                <th>{dict.tickets.department}</th>
                <th>{dict.tickets.priority}</th>
                <th>{dict.tickets.status}</th>
                <th>{dict.tickets.lastReply}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="mono font-semibold">
                    <Link href={`/${locale}/dashboard/tickets/${ticket.id}`} className="link">
                      {ticket.number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate">{ticket.subject}</td>
                  <td>{dict.ticketDepartments[ticket.department]}</td>
                  <td>
                    <Badge tone={statusTone[ticket.priority]}>
                      {dict.ticketPriorities[ticket.priority]}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={statusTone[ticket.status]}>
                      {dict.ticketStatus[ticket.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(ticket.lastReplyAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
