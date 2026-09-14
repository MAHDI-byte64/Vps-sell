import Link from "next/link";
import { ServerCrash } from "lucide-react";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default function NotFound() {
  // A not-found boundary cannot read route params, so it speaks the default
  // language; every in-app link still carries the visitor's locale.
  const dict = getDictionary(defaultLocale);
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center">
      <ServerCrash size={56} style={{ color: "var(--text-faint)" }} aria-hidden />
      <h1 className="text-2xl font-extrabold">{dict.common.notFound}</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {dict.common.notFoundBody}
      </p>
      <Link href={`/${defaultLocale}`} className="btn btn-primary">
        {dict.common.goHome}
      </Link>
    </div>
  );
}
