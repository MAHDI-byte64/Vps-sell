"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { localeMeta, switchLocalePath, type Locale } from "@/i18n/config";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next: Locale = locale === "fa" ? "en" : "fa";

  const query = searchParams.toString();
  const href = `${switchLocalePath(pathname, next)}${query ? `?${query}` : ""}`;

  return (
    <Link href={href} className="btn btn-ghost btn-sm gap-1.5" hrefLang={next}>
      <Languages size={16} aria-hidden />
      <span className="hidden sm:inline">{localeMeta[next].label}</span>
    </Link>
  );
}
