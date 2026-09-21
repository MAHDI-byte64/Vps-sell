import Link from "next/link";
import { notFound } from "next/navigation";
import { ServerOff } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CYCLE_ORDER } from "@/lib/billing";
import { countryFlag, locationCity } from "@/lib/catalog";
import { PlanCard } from "@/components/PlanCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BillingCycle, ProductType } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRODUCT_TYPES: ProductType[] = ["VPS_LINUX", "VPS_WINDOWS", "DEDICATED"];

function parseType(value?: string): ProductType | null {
  return PRODUCT_TYPES.includes(value as ProductType) ? (value as ProductType) : null;
}

function parseCycle(value?: string): BillingCycle {
  return CYCLE_ORDER.includes(value as BillingCycle) ? (value as BillingCycle) : "MONTHLY";
}

export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; location?: string; cycle?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  const query = await searchParams;
  const type = parseType(query.type);
  const cycle = parseCycle(query.cycle);
  const locationCode = query.location;

  const settings = await getSettings();
  const locations = await prisma.location.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const activeLocation = locations.find((l) => l.code === locationCode);

  const plans = await prisma.plan.findMany({
    where: {
      active: true,
      ...(type ? { type } : {}),
      ...(activeLocation ? { locations: { some: { id: activeLocation.id } } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
  });

  /** Builds a filter link that preserves the other two filters. */
  function filterHref(patch: { type?: string | null; location?: string | null; cycle?: string }) {
    const next = new URLSearchParams();
    const nextType = patch.type === undefined ? query.type : patch.type;
    const nextLocation = patch.location === undefined ? query.location : patch.location;
    const nextCycle = patch.cycle ?? query.cycle;
    if (nextType) next.set("type", nextType);
    if (nextLocation) next.set("location", nextLocation);
    if (nextCycle) next.set("cycle", nextCycle);
    const qs = next.toString();
    return `/${locale}/plans${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = Boolean(type || activeLocation);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">{dict.plans.title}</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.plans.subtitle}
        </p>
      </header>

      {/* --------------------------- filters ---------------------------- */}
      <div className="card mt-10 flex flex-col gap-5 p-5">
        <FilterRow label={dict.plans.filterType}>
          <Chip href={filterHref({ type: null })} active={!type}>
            {dict.plans.allTypes}
          </Chip>
          {PRODUCT_TYPES.map((value) => (
            <Chip key={value} href={filterHref({ type: value })} active={type === value}>
              {dict.productTypes[value]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={dict.plans.filterLocation}>
          <Chip href={filterHref({ location: null })} active={!activeLocation}>
            {dict.plans.allTypes}
          </Chip>
          {locations.map((location) => (
            <Chip
              key={location.id}
              href={filterHref({ location: location.code })}
              active={activeLocation?.id === location.id}
            >
              <span aria-hidden>{countryFlag(location.countryCode)}</span>{" "}
              {locationCity(location, locale)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={dict.plans.filterCycle}>
          {CYCLE_ORDER.map((value) => {
            const discount = settings.cycleDiscounts[value];
            return (
              <Chip key={value} href={filterHref({ cycle: value })} active={cycle === value}>
                {dict.cycles[value]}
                {discount > 0 && (
                  <span className="badge badge-ok ms-1.5 px-1.5 py-0 text-[10px]">
                    −{discount}%
                  </span>
                )}
              </Chip>
            );
          })}
        </FilterRow>
      </div>

      {/* ---------------------------- results --------------------------- */}
      {plans.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<ServerOff size={26} />}
            title={dict.plans.empty}
            action={
              hasFilters ? (
                <Link href={`/${locale}/plans`} className="btn btn-outline btn-sm">
                  {dict.plans.clearFilters}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              dict={dict}
              cycle={cycle}
              discounts={settings.cycleDiscounts}
              usdRate={settings.usdRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <span className="shrink-0 text-xs font-bold sm:w-24" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--brand)" : "var(--surface-sunken)",
        color: active ? "var(--brand-contrast)" : "var(--text-muted)",
        borderColor: active ? "var(--brand)" : "var(--line)",
      }}
    >
      {children}
    </Link>
  );
}
