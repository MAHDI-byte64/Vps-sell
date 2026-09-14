import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LifeBuoy, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSettings } from "@/lib/settings";
import { localizeDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.contact.title, description: dict.contact.subtitle };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const settings = await getSettings();

  const channels = [
    {
      Icon: Mail,
      label: dict.contact.email,
      value: settings.supportEmail,
      href: `mailto:${settings.supportEmail}`,
      ltr: true,
    },
    {
      Icon: Phone,
      label: dict.contact.phone,
      value: localizeDigits(settings.supportPhone, locale),
      href: `tel:${settings.supportPhone.replace(/[^\d+]/g, "")}`,
      ltr: true,
    },
    {
      Icon: MessageCircle,
      label: dict.contact.telegram,
      value: `@${settings.telegram}`,
      href: `https://t.me/${settings.telegram}`,
      ltr: true,
    },
    {
      Icon: MapPin,
      label: dict.contact.address,
      value: locale === "fa" ? settings.addressFa : settings.addressEn,
      ltr: false,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">{dict.contact.title}</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.contact.subtitle}
        </p>
      </header>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {channels.map((channel) => {
          const content = (
            <>
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                aria-hidden
              >
                <channel.Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {channel.label}
                </p>
                <p className={`mt-1 font-bold ${channel.ltr ? "ltr-text" : ""}`}>{channel.value}</p>
              </div>
            </>
          );
          const className = "card flex items-center gap-4 p-5";
          return channel.href ? (
            <a
              key={channel.label}
              href={channel.href}
              className={className}
              target={channel.href.startsWith("http") ? "_blank" : undefined}
              rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {content}
            </a>
          ) : (
            <div key={channel.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="card mt-8 flex flex-col items-center gap-4 p-8 text-center">
        <LifeBuoy size={30} style={{ color: "var(--brand)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.contact.ticketCta}
        </p>
        <Link href={`/${locale}/dashboard/tickets/new`} className="btn btn-primary btn-sm">
          {dict.contact.openTicket}
        </Link>
      </div>
    </div>
  );
}
