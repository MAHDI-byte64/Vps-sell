import Link from "next/link";
import { Check, Cpu, HardDrive, MemoryStick, Network, Wifi } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Plan } from "@/lib/types";
import type { BillingCycle } from "@/lib/types";
import { formatBandwidth, formatMoney, formatNumber, formatRam } from "@/lib/format";
import { priceForCycle, type CycleDiscounts } from "@/lib/billing";
import { planCpuNote, planDescription, planName } from "@/lib/catalog";
import { Badge } from "./ui/Badge";

export function PlanCard({
  plan,
  locale,
  dict,
  cycle,
  discounts,
  usdRate,
}: {
  plan: Plan;
  locale: Locale;
  dict: Dictionary;
  cycle: BillingCycle;
  discounts: CycleDiscounts;
  usdRate: number;
}) {
  const price = priceForCycle(plan.priceMonthly, cycle, discounts);
  const outOfStock = plan.stock !== null && plan.stock <= 0;

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
    {
      Icon: Wifi,
      label: dict.plans.port,
      value: `${formatNumber(plan.portMbps, locale)} Mbps`,
    },
  ];

  return (
    <article
      className="card relative flex flex-col p-6 transition-transform hover:-translate-y-0.5"
      style={plan.featured ? { borderColor: "var(--brand)" } : undefined}
    >
      {plan.featured && (
        <span className="absolute -top-2.5 end-5">
          <Badge tone="brand">{dict.plans.popular}</Badge>
        </span>
      )}

      <header>
        <h3 className="text-lg font-extrabold">{planName(plan, locale)}</h3>
        {planDescription(plan, locale) && (
          <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            {planDescription(plan, locale)}
          </p>
        )}
      </header>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold" style={{ color: "var(--brand)" }}>
          {formatMoney(price, locale, usdRate)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          / {dict.cycles[cycle]}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-3 border-t pt-5">
        {specs.map((spec) => (
          <li key={spec.label} className="flex items-center gap-2.5 text-sm">
            <spec.Icon size={16} style={{ color: "var(--brand)" }} aria-hidden />
            <span style={{ color: "var(--text-muted)" }}>{spec.label}</span>
            <span className="ms-auto text-end font-semibold">
              {spec.value}
              {spec.note ? (
                <span className="block text-[11px] font-normal" style={{ color: "var(--text-faint)" }}>
                  {spec.note}
                </span>
              ) : null}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2.5 text-sm">
          <Check size={16} style={{ color: "var(--brand)" }} aria-hidden />
          <span style={{ color: "var(--text-muted)" }}>{dict.plans.ipv4}</span>
          <span className="ms-auto font-semibold">{formatNumber(plan.ipv4Count, locale)}</span>
        </li>
      </ul>

      <div className="mt-6 flex gap-2">
        {outOfStock ? (
          <button type="button" className="btn btn-outline w-full" disabled>
            {dict.plans.outOfStock}
          </button>
        ) : (
          <Link href={`/${locale}/plans/${plan.slug}`} className="btn btn-primary w-full">
            {dict.plans.configure}
          </Link>
        )}
      </div>
    </article>
  );
}
