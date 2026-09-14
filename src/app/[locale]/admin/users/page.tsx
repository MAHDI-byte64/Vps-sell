import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const { q } = await searchParams;
  const search = q?.trim();
  const settings = await getSettings();

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : {},
    include: { _count: { select: { services: true, orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.users}</h1>

      <form className="flex gap-2" action={`/${locale}/admin/users`}>
        <input
          name="q"
          type="search"
          className="input max-w-xs"
          placeholder={dict.admin.searchPlaceholder}
          defaultValue={search ?? ""}
        />
        <button type="submit" className="btn btn-outline btn-sm">
          {dict.admin.search}
        </button>
      </form>

      {users.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.auth.name}</th>
                <th>{dict.auth.email}</th>
                <th>{dict.dashboard.balance}</th>
                <th>{dict.admin.services}</th>
                <th>{dict.admin.orders}</th>
                <th>{dict.admin.date}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="font-semibold">{user.name}</span>
                    <span className="ms-2 inline-flex gap-1.5">
                      {user.role === "ADMIN" && <Badge tone="brand">{dict.admin.title}</Badge>}
                      {!user.active && <Badge tone="danger">{dict.common.inactive}</Badge>}
                    </span>
                  </td>
                  <td className="ltr-text">{user.email}</td>
                  <td className="font-semibold whitespace-nowrap">
                    {formatMoney(user.walletBalance, locale, settings.usdRate)}
                  </td>
                  <td>{formatNumber(user._count.services, locale)}</td>
                  <td>{formatNumber(user._count.orders, locale)}</td>
                  <td className="whitespace-nowrap">{formatDate(user.createdAt, locale)}</td>
                  <td>
                    <Link
                      href={`/${locale}/admin/users/${user.id}`}
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
