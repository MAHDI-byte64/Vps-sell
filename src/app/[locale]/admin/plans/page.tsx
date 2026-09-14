import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney, formatNumber, formatRam } from "@/lib/format";
import { countryFlag, locationCity, planName } from "@/lib/catalog";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PlanEditor } from "./PlanEditor";
import { savePlanAction, togglePlanActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const flags = await searchParams;
  const settings = await getSettings();

  const [plans, locations] = await Promise.all([
    prisma.plan.findMany({
      include: { locations: { select: { id: true } } },
      orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
    }),
    prisma.location.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const editing = flags.edit ? plans.find((plan) => plan.id === flags.edit) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.plans}</h1>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error === "slug" && (
        <Alert variant="error">
          {locale === "fa" ? "این نامک قبلاً استفاده شده است." : "That slug is already taken."}
        </Alert>
      )}
      {flags.error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <PlanEditor
        locale={locale}
        dict={dict}
        plan={
          editing
            ? {
                ...editing,
                locationIds: editing.locations.map((location) => location.id),
              }
            : null
        }
        locations={locations.map((location) => ({
          id: location.id,
          label: `${countryFlag(location.countryCode)} ${locationCity(location, locale)}`,
        }))}
        action={savePlanAction}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{dict.services.plan}</th>
              <th>{dict.plans.filterType}</th>
              <th>{dict.plans.specs}</th>
              <th>{dict.plans.perMonth}</th>
              <th>{dict.admin.status}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <span className="font-semibold">{planName(plan, locale)}</span>
                  <span className="mono block text-xs" style={{ color: "var(--text-faint)" }}>
                    {plan.slug}
                  </span>
                </td>
                <td className="whitespace-nowrap">{dict.productTypes[plan.type]}</td>
                <td className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {formatNumber(plan.cpuCores, locale)} {dict.plans.core} ·{" "}
                  {formatRam(plan.ramMb, locale)} · {formatNumber(plan.diskGb, locale)}GB
                </td>
                <td className="font-semibold whitespace-nowrap">
                  {formatMoney(plan.priceMonthly, locale, settings.usdRate)}
                </td>
                <td>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={plan.active ? "ok" : "muted"}>
                      {plan.active ? dict.common.active : dict.common.inactive}
                    </Badge>
                    {plan.featured && <Badge tone="brand">{dict.plans.popular}</Badge>}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <a
                      href={`/${locale}/admin/plans?edit=${plan.id}#plan-editor`}
                      className="btn btn-outline btn-sm"
                    >
                      {dict.admin.edit}
                    </a>
                    <form action={togglePlanActiveAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="planId" value={plan.id} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        {plan.active ? dict.admin.deactivate : dict.admin.reactivate}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
