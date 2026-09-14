import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { FaqAccordion } from "@/components/FaqAccordion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.faq.title, description: dict.faq.subtitle };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">{dict.faq.title}</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.faq.subtitle}
        </p>
      </header>
      <div className="mt-12">
        <FaqAccordion items={dict.faq.items} />
      </div>
    </div>
  );
}
