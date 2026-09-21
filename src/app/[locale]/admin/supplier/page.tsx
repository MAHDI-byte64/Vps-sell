import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterTabs } from "@/components/admin/FilterTabs";
import {
  createPlanFromSupplierAction,
  syncSupplierAction,
  unlinkSupplierProductAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    synced?: string;
    created?: string;
    updated?: string;
    refreshed?: string;
    error?: string;
  }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const query = await searchParams;
  const settings = await getSettings();

  const configured = Boolean(env.radibApiToken);

  const [rows, categories, lastSync] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: {
        ...(query.category ? { categoryName: query.category } : {}),
        ...(query.q
          ? { title: { contains: query.q, mode: "insensitive" as const } }
          : {}),
      },
      include: { linkedPlan: { select: { id: true, active: true, nameFa: true } } },
      orderBy: [{ categoryName: "asc" }, { title: "asc" }],
      take: 300,
    }),
    prisma.supplierProduct.groupBy({ by: ["categoryName"], _count: true }),
    prisma.supplierProduct.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{dict.admin.supplier.title}</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.admin.supplier.subtitle}
          </p>
        </div>

        <form action={syncSupplierAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn-primary" disabled={!configured}>
            <RefreshCw size={16} aria-hidden />
            {dict.admin.supplier.syncNow}
          </button>
        </form>
      </header>

      {!configured && <Alert variant="warning">{dict.admin.supplier.notConfigured}</Alert>}

      {query.error === "notconfigured" && (
        <Alert variant="error">{dict.admin.supplier.notConfigured}</Alert>
      )}
      {query.error === "fetch" && <Alert variant="error">{dict.admin.supplier.syncFailed}</Alert>}
      {query.synced === "1" && (
        <Alert variant="success">
          {dict.admin.supplier.syncSummary
            .replace("{created}", query.created ?? "0")
            .replace("{updated}", query.updated ?? "0")
            .replace("{refreshed}", query.refreshed ?? "0")}
        </Alert>
      )}

      {lastSync && (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          {dict.admin.supplier.lastSync}: {formatDateTime(lastSync.lastSyncedAt, locale)}
        </p>
      )}

      {rows.length === 0 && categories.length === 0 ? (
        <EmptyState icon={<RefreshCw size={26} />} title={dict.admin.supplier.empty} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <FilterTabs
              basePath={`/${locale}/admin/supplier`}
              current={query.category}
              allLabel={dict.admin.all}
              options={categories.map((c) => ({
                value: c.categoryName,
                label: c.categoryName,
                count: c._count,
              }))}
            />

            <form className="flex gap-2" action={`/${locale}/admin/supplier`}>
              {query.category && <input type="hidden" name="category" value={query.category} />}
              <input
                name="q"
                type="search"
                className="input max-w-xs"
                placeholder={dict.admin.searchPlaceholder}
                defaultValue={query.q ?? ""}
              />
              <button type="submit" className="btn btn-outline btn-sm">
                {dict.admin.search}
              </button>
            </form>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{dict.tickets.subject}</th>
                  <th>{dict.plans.filterType}</th>
                  <th>{dict.admin.amount}</th>
                  <th>{dict.admin.supplier.parsedSpec}</th>
                  <th>{dict.admin.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hasSpec =
                    row.parsedCpuCores || row.parsedRamMb || row.parsedDiskGb;
                  return (
                    <tr key={row.id}>
                      <td className="max-w-xs">
                        <span className="block truncate font-semibold">{row.title}</span>
                        {row.parsedLocationHint && (
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                            {row.parsedLocationHint}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                        {row.categoryName}
                      </td>
                      <td className="font-semibold whitespace-nowrap">
                        {formatMoney(row.currentPrice, locale, settings.usdRate)}
                      </td>
                      <td className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {hasSpec ? (
                          <>
                            {row.parsedCpuCores ? `${formatNumber(row.parsedCpuCores, locale)}×CPU ` : ""}
                            {row.parsedRamMb ? `${formatNumber(row.parsedRamMb / 1024, locale)}GB RAM ` : ""}
                            {row.parsedDiskGb ? `${formatNumber(row.parsedDiskGb, locale)}GB` : ""}
                          </>
                        ) : (
                          <span style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {row.linkedPlan ? (
                          <Badge tone={row.linkedPlan.active ? "ok" : "warn"}>
                            {row.linkedPlan.active
                              ? dict.admin.supplier.linkedActive
                              : dict.admin.supplier.linkedDraft}
                          </Badge>
                        ) : (
                          <Badge tone="muted">{dict.admin.supplier.notLinked}</Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {row.linkedPlan ? (
                            <>
                              <Link
                                href={`/${locale}/admin/plans?edit=${row.linkedPlan.id}#plan-editor`}
                                className="btn btn-outline btn-sm"
                              >
                                {dict.admin.edit}
                              </Link>
                              <form action={unlinkSupplierProductAction}>
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="supplierProductId" value={row.id} />
                                <button type="submit" className="btn btn-ghost btn-sm">
                                  {dict.admin.supplier.unlink}
                                </button>
                              </form>
                            </>
                          ) : (
                            <form action={createPlanFromSupplierAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="supplierProductId" value={row.id} />
                              <button type="submit" className="btn btn-primary btn-sm">
                                {dict.admin.supplier.createPlan}
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
