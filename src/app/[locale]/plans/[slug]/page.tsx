import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Cpu, HardDrive, MemoryStick, Network, Wifi, Globe } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatBandwidth, formatNumber, formatRam } from "@/lib/format";
import { countryFlag, locationCity, planCpuNote, planDescription, planName } from "@/lib/catalog";
import { OrderForm } from "./OrderForm";
import { addToCartAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (!plan) return {};
  return {
    title: planName(plan, locale),
    description: planDescription(plan, locale),
  };
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  const plan = await prisma.plan.findFirst({
    where: { slug, active: true },
    include: { locations: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!plan) notFound();

  const settings = await getSettings();

  // Dedicated boxes can run either family; a VPS plan is tied to its image type.
  const family = plan.type === "VPS_WINDOWS" ? "windows" : plan.type === "DEDICATED" ? undefined : "linux";
  const operatingSystems = await prisma.operatingSystem.findMany({
    where: { active: true, ...(family ? { family } : {}) },
    orderBy: { sortOrder: "asc" },
  });

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  const specs = [
    {
      Icon: Cpu,
      label: dict.plans.cpu,
      value: `${formatNumber(plan.cpuCores, locale)} ${dict.plans.core}`,
      note: planCpuNote(plan, locale),
    },
    { Icon: MemoryStick, label: dict.plans.ram, value: formatRam(plan.ramMb, locale) },
    {
      Icon: HardDrive,
      label: dict.plans.disk,
      value: `${formatNumber(plan.diskGb, locale)} ${locale === "fa" ? "گیگابایت" : "GB"} ${plan.diskType}`,
    },
    { Icon: Network, label: dict.plans.bandwidth, value: formatBandwidth(plan.bandwidthGb, locale) },
    { Icon: Wifi, label: dict.plans.port, value: `${formatNumber(plan.portMbps, locale)} Mbps` },
    { Icon: Globe, label: dict.plans.ipv4, value: formatNumber(plan.ipv4Count, locale) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link
        href={`/${locale}/plans`}
        className="btn btn-ghost btn-sm -ms-3"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.plans.backToPlans}
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* ------------------------- specifications ------------------------ */}
        <div className="lg:col-span-2">
          <span className="badge badge-brand">{dict.productTypes[plan.type]}</span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{planName(plan, locale)}</h1>
          {planDescription(plan, locale) && (
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
              {planDescription(plan, locale)}
            </p>
          )}

          <div className="card mt-6 p-5">
            <h2 className="text-sm font-bold">{dict.plans.specs}</h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              {specs.map((spec) => (
                <li key={spec.label} className="flex items-center gap-3 text-sm">
                  <spec.Icon size={17} style={{ color: "var(--brand)" }} aria-hidden />
                  <span style={{ color: "var(--text-muted)" }}>{spec.label}</span>
                  <span className="ms-auto text-end font-semibold">
                    {spec.value}
                    {spec.note ? (
                      <span
                        className="block text-[11px] font-normal"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {spec.note}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mt-4 p-5">
            <h2 className="text-sm font-bold">{dict.plans.location}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.locations.map((location) => (
                <span key={location.id} className="badge badge-muted">
                  <span aria-hidden>{countryFlag(location.countryCode)}</span>
                  {locationCity(location, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* --------------------------- order form -------------------------- */}
        <div className="lg:col-span-3">
          <OrderForm
            locale={locale}
            dict={dict}
            plan={{
              id: plan.id,
              slug: plan.slug,
              priceMonthly: plan.priceMonthly,
              setupFee: plan.setupFee,
              stock: plan.stock,
            }}
            locations={plan.locations.map((location) => ({
              id: location.id,
              label: `${countryFlag(location.countryCode)} ${locationCity(location, locale)}`,
            }))}
            operatingSystems={operatingSystems.map((os) => ({ id: os.id, label: os.name }))}
            discounts={settings.cycleDiscounts}
            usdRate={settings.usdRate}
            action={addToCartAction}
          />
        </div>
      </div>
    </div>
  );
}
