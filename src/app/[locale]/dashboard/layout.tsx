import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SideNav, type NavItem } from "@/components/SideNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard`);

  // Badge counts give the customer a reason to look at a tab before clicking it.
  const [unpaidInvoices, openTickets] = await Promise.all([
    prisma.invoice.count({ where: { userId: user.id, status: "UNPAID" } }),
    prisma.ticket.count({ where: { userId: user.id, status: { not: "CLOSED" } } }),
  ]);

  const items: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: dict.dashboard.overview,
      icon: "dashboard",
      exact: true,
    },
    { href: `/${locale}/dashboard/services`, label: dict.dashboard.services, icon: "server" },
    {
      href: `/${locale}/dashboard/invoices`,
      label: dict.dashboard.invoices,
      icon: "invoice",
      badge: unpaidInvoices,
    },
    { href: `/${locale}/dashboard/wallet`, label: dict.dashboard.wallet, icon: "wallet" },
    {
      href: `/${locale}/dashboard/tickets`,
      label: dict.dashboard.tickets,
      icon: "ticket",
      badge: openTickets,
    },
    { href: `/${locale}/dashboard/profile`, label: dict.dashboard.profile, icon: "user" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside>
          <SideNav items={items} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
