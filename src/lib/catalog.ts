import type { Locale } from "@/i18n/config";
import type { Plan, Location, OperatingSystem } from "@/lib/types";

/** Picks the right language column from a bilingual record. */
export function planName(plan: Pick<Plan, "nameFa" | "nameEn">, locale: Locale): string {
  return locale === "fa" ? plan.nameFa : plan.nameEn;
}

export function planDescription(plan: Pick<Plan, "descFa" | "descEn">, locale: Locale): string {
  return locale === "fa" ? plan.descFa : plan.descEn;
}

export function planCpuNote(
  plan: Pick<Plan, "cpuNoteFa" | "cpuNoteEn">,
  locale: Locale,
): string {
  return locale === "fa" ? plan.cpuNoteFa : plan.cpuNoteEn;
}

export function locationName(
  location: Pick<Location, "nameFa" | "nameEn">,
  locale: Locale,
): string {
  return locale === "fa" ? location.nameFa : location.nameEn;
}

export function locationCity(
  location: Pick<Location, "cityFa" | "cityEn">,
  locale: Locale,
): string {
  return locale === "fa" ? location.cityFa : location.cityEn;
}

export function osName(os: Pick<OperatingSystem, "name">): string {
  return os.name;
}

/** ISO-3166 alpha-2 to its regional-indicator emoji, e.g. "DE" -> 🇩🇪 */
export function countryFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - "A".charCodeAt(0)),
  );
}

/**
 * The immutable copy of a plan stored on an order line. Later catalogue edits
 * must never rewrite what a customer actually bought.
 */
export type PlanSnapshot = {
  slug: string;
  nameFa: string;
  nameEn: string;
  type: string;
  cpuCores: number;
  ramMb: number;
  diskGb: number;
  diskType: string;
  bandwidthGb: number;
  portMbps: number;
  ipv4Count: number;
  monthlyPrice: number;
};

export function snapshotPlan(plan: Plan): PlanSnapshot {
  return {
    slug: plan.slug,
    nameFa: plan.nameFa,
    nameEn: plan.nameEn,
    type: plan.type,
    cpuCores: plan.cpuCores,
    ramMb: plan.ramMb,
    diskGb: plan.diskGb,
    diskType: plan.diskType,
    bandwidthGb: plan.bandwidthGb,
    portMbps: plan.portMbps,
    ipv4Count: plan.ipv4Count,
    monthlyPrice: plan.priceMonthly,
  };
}

export function snapshotName(snapshot: unknown, locale: Locale): string {
  const snap = snapshot as Partial<PlanSnapshot> | null;
  if (!snap) return "—";
  return (locale === "fa" ? snap.nameFa : snap.nameEn) ?? snap.slug ?? "—";
}
