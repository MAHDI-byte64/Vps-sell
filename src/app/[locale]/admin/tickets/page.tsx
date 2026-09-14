import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/admin/FilterTabs";
import type { TicketStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: TicketStatus[] = ["OPEN", "CUSTOMER_REPLY", "ANSWERED", "CLOSED"];

export default async function AdminTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const { status } = await searchParams;
  const active = STATUSES.includes(status as TicketStatus) ? (status as TicketStatus) : undefined;

  const [tickets, counts] = await Promise.all([
    prisma.ticket.findMany({
      where: active ? { status: active } : {},
      include: { user: { select: { id: true, name: true, email: true } } },
      // Newest activity first, so whatever a customer just wrote is on top.
      orderBy: { lastReplyAt: "desc" },
      take: 100,
    }),
    prisma.ticket.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (value: TicketStatus) => counts.find((row) => row.status === value)?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.tickets}</h1>

      <FilterTabs
        basePath={`/${locale}/admin/tickets`}
        current={active}
        allLabel={dict.admin.all}
        options={STATUSES.map((value) => ({
          value,
          label: dict.ticketStatus[value],
          count: countOf(value),
        }))}
      />

      {tickets.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.tickets.number}</th>
                <th>{dict.tickets.subject}</th>
                <th>{dict.admin.customer}</th>
                <th>{dict.tickets.department}</th>
                <th>{dict.tickets.priority}</th>
                <th>{dict.admin.status}</th>
                <th>{dict.tickets.lastReply}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="mono font-semibold">
                    <Link href={`/${locale}/admin/tickets/${ticket.id}`} className="link">
                      {ticket.number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate">{ticket.subject}</td>
                  <td>
                    <Link href={`/${locale}/admin/users/${ticket.user.id}`} className="link">
                      {ticket.user.name}
                    </Link>
                  </td>
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
