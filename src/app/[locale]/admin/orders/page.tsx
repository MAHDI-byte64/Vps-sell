import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/admin/FilterTabs";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROVISIONING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
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
  const active = STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const settings = await getSettings();

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: active ? { status: active } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (value: OrderStatus) => counts.find((row) => row.status === value)?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.orders}</h1>

      <FilterTabs
        basePath={`/${locale}/admin/orders`}
        current={active}
        allLabel={dict.admin.all}
        options={STATUSES.map((value) => ({
          value,
          label: dict.orderStatus[value],
          count: countOf(value),
        }))}
      />

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{dict.admin.customer}</th>
                <th>{dict.cart.item}</th>
                <th>{dict.admin.amount}</th>
                <th>{dict.admin.status}</th>
                <th>{dict.admin.date}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono font-semibold">{order.number}</td>
                  <td>
                    <Link href={`/${locale}/admin/users/${order.user.id}`} className="link font-semibold">
                      {order.user.name}
                    </Link>
                    <span className="ltr-text block text-xs" style={{ color: "var(--text-faint)" }}>
                      {order.user.email}
                    </span>
                  </td>
                  <td>{order._count.items}</td>
                  <td className="font-semibold whitespace-nowrap">
                    {formatMoney(order.total, locale, settings.usdRate)}
                  </td>
                  <td>
                    <Badge tone={statusTone[order.status]}>{dict.orderStatus[order.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(order.createdAt, locale)}</td>
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
    </div>
  );
}
