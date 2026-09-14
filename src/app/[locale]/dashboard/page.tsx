import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, FileText, LifeBuoy, Server, ShoppingCart, Wallet } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { daysUntil, formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { StatCard } from "@/components/StatCard";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard`);
  const settings = await getSettings();

  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

  const [activeServices, unpaidCount, openTickets, expiring, recentInvoices] = await Promise.all([
    prisma.service.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.invoice.count({ where: { userId: user.id, status: "UNPAID" } }),
    prisma.ticket.count({ where: { userId: user.id, status: { not: "CLOSED" } } }),
    prisma.service.findMany({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "EXPIRED"] },
        expiresAt: { lte: warningDate },
      },
      orderBy: { expiresAt: "asc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-extrabold">
          {dict.dashboard.welcome}، {user.name}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={Server}
          label={dict.dashboard.activeServices}
          value={formatNumber(activeServices, locale)}
          href={`/${locale}/dashboard/services`}
        />
        <StatCard
          Icon={FileText}
          label={dict.dashboard.unpaidInvoices}
          value={formatNumber(unpaidCount, locale)}
          href={`/${locale}/dashboard/invoices`}
          tone={unpaidCount > 0 ? "var(--warn)" : "var(--brand)"}
        />
        <StatCard
          Icon={LifeBuoy}
          label={dict.dashboard.openTickets}
          value={formatNumber(openTickets, locale)}
          href={`/${locale}/dashboard/tickets`}
        />
        <StatCard
          Icon={Wallet}
          label={dict.dashboard.balance}
          value={formatMoney(user.walletBalance, locale, settings.usdRate)}
          href={`/${locale}/dashboard/wallet`}
          tone="var(--ok)"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --------------------------- expiring --------------------------- */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <AlertTriangle size={17} style={{ color: "var(--warn)" }} aria-hidden />
            {dict.dashboard.expiringSoon}
          </h2>

          {expiring.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {dict.dashboard.noExpiring}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {expiring.map((service) => {
                const left = daysUntil(service.expiresAt);
                return (
                  <li key={service.id}>
                    <Link
                      href={`/${locale}/dashboard/services/${service.id}`}
                      className="flex items-center gap-3 rounded-xl border p-3 transition-colors"
                      style={{ background: "var(--surface-sunken)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{service.label}</p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                          {formatDate(service.expiresAt, locale)}
                        </p>
                      </div>
                      <Badge tone={left !== null && left <= 3 ? "danger" : "warn"}>
                        {left !== null && left > 0
                          ? `${formatNumber(left, locale)} ${dict.services.daysLeft}`
                          : dict.services.expired}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ------------------------ recent invoices ----------------------- */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <FileText size={17} style={{ color: "var(--brand)" }} aria-hidden />
            {dict.dashboard.recentInvoices}
          </h2>

          {recentInvoices.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {dict.invoices.empty}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {recentInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/${locale}/dashboard/invoices/${invoice.id}`}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{ background: "var(--surface-sunken)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="mono truncate text-sm font-semibold">{invoice.number}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                        {formatDate(invoice.createdAt, locale)}
                      </p>
                    </div>
                    <span className="text-sm font-bold">
                      {formatMoney(invoice.total, locale, settings.usdRate)}
                    </span>
                    <Badge tone={statusTone[invoice.status]}>
                      {dict.invoiceStatus[invoice.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* -------------------------- quick actions ------------------------- */}
      <section className="card p-5">
        <h2 className="font-bold">{dict.dashboard.quickActions}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/${locale}/plans`} className="btn btn-primary btn-sm">
            <ShoppingCart size={15} aria-hidden />
            {dict.dashboard.buyServer}
          </Link>
          <Link href={`/${locale}/dashboard/wallet`} className="btn btn-outline btn-sm">
            <Wallet size={15} aria-hidden />
            {dict.dashboard.topUp}
          </Link>
          <Link href={`/${locale}/dashboard/tickets/new`} className="btn btn-outline btn-sm">
            <LifeBuoy size={15} aria-hidden />
            {dict.dashboard.newTicket}
          </Link>
        </div>
      </section>
    </div>
  );
}
