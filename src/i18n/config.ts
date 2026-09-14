export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

export const localeMeta: Record<Locale, { dir: "rtl" | "ltr"; label: string; htmlLang: string }> = {
  fa: { dir: "rtl", label: "فارسی", htmlLang: "fa-IR" },
  en: { dir: "ltr", label: "English", htmlLang: "en" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Swaps the locale segment of a pathname, e.g. /fa/plans -> /en/plans */
export function switchLocalePath(pathname: string, next: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = next;
    return `/${segments.join("/")}`;
  }
  return `/${next}${pathname}`;
}
