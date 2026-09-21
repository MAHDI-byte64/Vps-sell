import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreditCard,
  FileText,
  LifeBuoy,
  Server,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const settings = await getSettings();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    revenueAll,
    revenueMonth,
    userCount,
    activeServices,
    pendingDelivery,
    unpaidInvoices,
    pendingPayments,
    openTickets,
    latestOrders,
  ] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    prisma.invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.user.count(),
    prisma.service.count({ where: { status: "ACTIVE" } }),
    prisma.service.count({ where: { status: "PENDING" } }),
    prisma.invoice.count({ where: { status: "UNPAID" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "CUSTOMER_REPLY"] } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  // Revenue excludes wallet top-ups: crediting a wallet is not a sale, and
  // counting both would book the same money twice.
  const topUpAll = await prisma.invoice.aggregate({
    where: { status: "PAID", type: "WALLET_TOPUP" },
    _sum: { total: true },
  });
  const topUpMonth = await prisma.invoice.aggregate({
    where: { status: "PAID", type: "WALLET_TOPUP", paidAt: { gte: monthStart } },
    _sum: { total: true },
  });

  const totalRevenue = (revenueAll._sum.total ?? 0) - (topUpAll._sum.total ?? 0);
  const monthRevenue = (revenueMonth._sum.total ?? 0) - (topUpMonth._sum.total ?? 0);

  const attention = [
    {
      count: pendingDelivery,
      label: dict.admin.pendingDelivery,
      href: `/${locale}/admin/services?status=PENDING`,
    },
    {
      count: pendingPayments,
      label: dict.admin.pendingPayments,
      href: `/${locale}/admin/payments`,
    },
    { count: openTickets, label: dict.admin.openTickets, href: `/${locale}/admin/tickets` },
    {
      count: unpaidInvoices,
      label: dict.admin.unpaidInvoices,
      href: `/${locale}/admin/invoices?status=UNPAID`,
    },
  ].filter((row) => row.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.overview}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={TrendingUp}
          label={dict.admin.revenue}
          value={formatMoney(totalRevenue, locale, settings.usdRate)}
          tone="var(--ok)"
        />
        <StatCard
          Icon={Wallet}
          label={dict.admin.revenueMonth}
          value={formatMoney(monthRevenue, locale, settings.usdRate)}
          tone="var(--ok)"
        />
        <StatCard
          Icon={Users}
          label={dict.admin.totalUsers}
          value={formatNumber(userCount, locale)}
          href={`/${locale}/admin/users`}
        />
        <StatCard
          Icon={Server}
          label={dict.admin.activeServices}
          value={formatNumber(activeServices, locale)}
          href={`/${locale}/admin/services`}
        />
      </div>

      {/* -------------------------- needs attention ------------------------ */}
      <section className="card p-5">
        <h2 className="font-bold">{dict.admin.needsAttention}</h2>
        {attention.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.admin.allGood}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attention.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center gap-3 rounded-xl border p-3.5"
                style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}
              >
                <span className="text-xl font-extrabold" style={{ color: "var(--warn)" }}>
                  {formatNumber(row.count, locale)}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--warn)" }}>
                  {row.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------- latest orders ------------------------- */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{dict.admin.latestOrders}</h2>
          <Link href={`/${locale}/admin/orders`} className="link text-sm">
            {dict.admin.orders}
          </Link>
        </div>

        {latestOrders.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.admin.noResults}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{dict.admin.customer}</th>
                  <th>{dict.admin.date}</th>
                  <th>{dict.admin.amount}</th>
                  <th>{dict.admin.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="mono font-semibold">{order.number}</td>
                    <td>
                      <span className="font-semibold">{order.user.name}</span>
                      <span
                        className="ltr-text block text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {order.user.email}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(order.createdAt, locale)}</td>
                    <td className="font-semibold whitespace-nowrap">
                      {formatMoney(order.total, locale, settings.usdRate)}
                    </td>
                    <td>
                      <Badge tone={statusTone[order.status]}>
                        {dict.orderStatus[order.status]}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        href={`/${locale}/admin/orders/${order.id}`}
                        className="btn btn-outline btn-sm"
                      >
                        {dict.admin.view}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          Icon={ShoppingBag}
          label={dict.admin.pendingDelivery}
          value={formatNumber(pendingDelivery, locale)}
          href={`/${locale}/admin/services?status=PENDING`}
          tone="var(--warn)"
        />
        <StatCard
          Icon={CreditCard}
          label={dict.admin.pendingPayments}
          value={formatNumber(pendingPayments, locale)}
          href={`/${locale}/admin/payments`}
          tone="var(--warn)"
        />
        <StatCard
          Icon={FileText}
          label={dict.admin.unpaidInvoices}
          value={formatNumber(unpaidInvoices, locale)}
          href={`/${locale}/admin/invoices?status=UNPAID`}
        />
      </section>

      <Link href={`/${locale}/admin/tickets`} className="card flex items-center gap-3 p-4">
        <LifeBuoy size={18} style={{ color: "var(--brand)" }} aria-hidden />
        <span className="text-sm font-semibold">{dict.admin.openTickets}</span>
        <span className="ms-auto text-lg font-extrabold">{formatNumber(openTickets, locale)}</span>
      </Link>
    </div>
  );
}
