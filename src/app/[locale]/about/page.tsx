import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Eye, Gauge, MessageSquare } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).about.title };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  const values = [
    { Icon: Eye, title: dict.about.value1Title, body: dict.about.value1Body },
    { Icon: Gauge, title: dict.about.value2Title, body: dict.about.value2Body },
    { Icon: MessageSquare, title: dict.about.value3Title, body: dict.about.value3Body },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">{dict.about.title}</h1>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-8" style={{ color: "var(--text-muted)" }}>
        <p>{dict.about.body1}</p>
        <p>{dict.about.body2}</p>
      </div>

      <h2 className="mt-14 text-xl font-extrabold">{dict.about.valuesTitle}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {values.map((value) => (
          <div key={value.title} className="card p-6">
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              aria-hidden
            >
              <value.Icon size={20} />
            </span>
            <h3 className="mt-4 font-bold">{value.title}</h3>
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
              {value.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
