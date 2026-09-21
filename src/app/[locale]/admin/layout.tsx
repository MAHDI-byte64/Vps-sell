import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SideNav, type NavItem } from "@/components/SideNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
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

  // Every admin page sits under this guard; a non-admin is bounced to their
  // own dashboard rather than shown an error.
  await requireAdmin(locale);

  const [pendingOrders, pendingPayments, openTickets] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PAID", "PROVISIONING"] } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "CUSTOMER_REPLY"] } } }),
  ]);

  const items: NavItem[] = [
    {
      href: `/${locale}/admin`,
      label: dict.admin.overview,
      icon: "dashboard",
      exact: true,
    },
    {
      href: `/${locale}/admin/orders`,
      label: dict.admin.orders,
      icon: "orders",
      badge: pendingOrders,
    },
    { href: `/${locale}/admin/services`, label: dict.admin.services, icon: "server" },
    { href: `/${locale}/admin/invoices`, label: dict.admin.invoices, icon: "invoice" },
    {
      href: `/${locale}/admin/payments`,
      label: dict.admin.payments,
      icon: "payments",
      badge: pendingPayments,
    },
    {
      href: `/${locale}/admin/tickets`,
      label: dict.admin.tickets,
      icon: "ticket",
      badge: openTickets,
    },
    { href: `/${locale}/admin/users`, label: dict.admin.users, icon: "users" },
    { href: `/${locale}/admin/plans`, label: dict.admin.plans, icon: "plans" },
    { href: `/${locale}/admin/coupons`, label: dict.admin.coupons, icon: "coupons" },
    { href: `/${locale}/admin/posts`, label: dict.admin.posts, icon: "posts" },
    { href: `/${locale}/admin/settings`, label: dict.admin.settings, icon: "settings" },
  ];

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside>
          <div className="mb-4 flex items-center gap-2">
            <span className="badge badge-brand">{dict.admin.title}</span>
          </div>
          <SideNav items={items} />
          <Link
            href={`/${locale}`}
            className="btn btn-ghost btn-sm mt-4 w-full justify-start"
            style={{ color: "var(--text-muted)" }}
          >
            <Arrow size={15} aria-hidden />
            {dict.admin.backToSite}
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
