import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { locationCity } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/admin/FilterTabs";
import type { ServiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: ServiceStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "TERMINATED"];

export default async function AdminServicesPage({
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
  const active = STATUSES.includes(status as ServiceStatus) ? (status as ServiceStatus) : undefined;

  const [services, counts] = await Promise.all([
    prisma.service.findMany({
      where: active ? { status: active } : {},
      include: {
        user: { select: { name: true, email: true } },
        location: true,
        os: { select: { name: true } },
      },
      // Pending deliveries are the admin's actual queue, so they come first.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.service.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (value: ServiceStatus) =>
    counts.find((row) => row.status === value)?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.services}</h1>

      <FilterTabs
        basePath={`/${locale}/admin/services`}
        current={active}
        allLabel={dict.admin.all}
        options={STATUSES.map((value) => ({
          value,
          label: dict.serviceStatus[value],
          count: countOf(value),
        }))}
      />

      {services.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.services.label}</th>
                <th>{dict.admin.customer}</th>
                <th>{dict.services.ip}</th>
                <th>{dict.services.location}</th>
                <th>{dict.services.expires}</th>
                <th>{dict.admin.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="font-semibold">
                    {service.label}
                    <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                      {service.os.name}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold">{service.user.name}</span>
                    <span className="ltr-text block text-xs" style={{ color: "var(--text-faint)" }}>
                      {service.user.email}
                    </span>
                  </td>
                  <td className="mono">{service.ipv4 ?? "—"}</td>
                  <td className="whitespace-nowrap">{locationCity(service.location, locale)}</td>
                  <td className="whitespace-nowrap">{formatDate(service.expiresAt, locale)}</td>
                  <td>
                    <Badge tone={statusTone[service.status]}>
                      {dict.serviceStatus[service.status]}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      href={`/${locale}/admin/services/${service.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      {service.status === "PENDING" ? dict.admin.deliver : dict.admin.view}
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
