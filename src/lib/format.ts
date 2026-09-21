import type { Locale } from "@/i18n/config";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Renders Latin digits as Persian ones for the fa locale. */
export function localizeDigits(input: string, locale: Locale): string {
  if (locale !== "fa") return input;
  return input.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatNumber(value: number, locale: Locale): string {
  return localizeDigits(new Intl.NumberFormat("en-US").format(value), locale);
}

/**
 * All amounts are stored as whole Tomans. The English locale shows the USD
 * equivalent at the admin-managed rate; Persian shows the authoritative Toman
 * figure. `usdRate` is "Toman per 1 USD".
 */
export function formatMoney(toman: number, locale: Locale, usdRate: number): string {
  if (locale === "en") {
    const usd = usdRate > 0 ? toman / usdRate : 0;
    // Sub-cent prices would read as "$0.00"; show two decimals like a price tag.
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd)}`;
  }
  return `${formatNumber(toman, "fa")} تومان`;
}

/** Short form for dense tables: "۴۵۰,۰۰۰ ت" / "$5.36" */
export function formatMoneyShort(toman: number, locale: Locale, usdRate: number): string {
  if (locale === "en") return formatMoney(toman, locale, usdRate);
  return `${formatNumber(toman, "fa")} ت`;
}

export function formatDate(date: Date | string | null | undefined, locale: Locale): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  return formatter.format(d);
}

export function formatDateTime(date: Date | string | null | undefined, locale: Locale): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(d);
}

/** "in 12 days" / "۱۲ روز مانده" — used on service expiry badges. */
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function formatRam(ramMb: number, locale: Locale): string {
  if (ramMb >= 1024 && ramMb % 1024 === 0) {
    return `${formatNumber(ramMb / 1024, locale)} ${locale === "fa" ? "گیگابایت" : "GB"}`;
  }
  return `${formatNumber(ramMb, locale)} ${locale === "fa" ? "مگابایت" : "MB"}`;
}

export function formatBandwidth(gb: number, locale: Locale): string {
  if (gb === 0) return locale === "fa" ? "نامحدود" : "Unmetered";
  if (gb >= 1024 && gb % 1024 === 0) {
    return `${formatNumber(gb / 1024, locale)} ${locale === "fa" ? "ترابایت" : "TB"}`;
  }
  return `${formatNumber(gb, locale)} ${locale === "fa" ? "گیگابایت" : "GB"}`;
}
