import Link from "next/link";
import { Mail, MessageCircle, Phone, Server } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { SiteSettings } from "@/lib/settings";
import { localizeDigits } from "@/lib/format";

export function Footer({
  locale,
  dict,
  settings,
}: {
  locale: Locale;
  dict: Dictionary;
  settings: SiteSettings;
}) {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: dict.footer.products,
      links: [
        { href: `/${locale}/plans?type=VPS_LINUX`, label: dict.nav.vpsLinux },
        { href: `/${locale}/plans?type=VPS_WINDOWS`, label: dict.nav.vpsWindows },
        { href: `/${locale}/plans?type=DEDICATED`, label: dict.nav.dedicated },
      ],
    },
    {
      title: dict.footer.company,
      links: [
        { href: `/${locale}/about`, label: dict.nav.about },
        { href: `/${locale}/blog`, label: dict.nav.blog },
        { href: `/${locale}/contact`, label: dict.nav.contact },
      ],
    },
    {
      title: dict.footer.support,
      links: [
        { href: `/${locale}/faq`, label: dict.nav.faq },
        { href: `/${locale}/dashboard/tickets`, label: dict.tickets.title },
        { href: `/${locale}/dashboard`, label: dict.nav.dashboard },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t" style={{ background: "var(--surface-raised)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 font-extrabold">
              <span
                className="flex size-9 items-center justify-center rounded-xl"
                style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
                aria-hidden
              >
                <Server size={18} />
              </span>
              <span>{settings.siteName}</span>
            </div>
            <p className="mt-4 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
              {dict.footer.about}
            </p>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <a
                href={`mailto:${settings.supportEmail}`}
                className="flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <Mail size={15} aria-hidden />
                <span className="ltr-text">{settings.supportEmail}</span>
              </a>
              <a
                href={`tel:${settings.supportPhone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <Phone size={15} aria-hidden />
                <span className="ltr-text">{localizeDigits(settings.supportPhone, locale)}</span>
              </a>
              <a
                href={`https://t.me/${settings.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <MessageCircle size={15} aria-hidden />
                <span className="ltr-text">@{settings.telegram}</span>
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold">{column.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row"
          style={{ color: "var(--text-faint)" }}
        >
          <p>
            © {localizeDigits(String(year), locale)} {settings.siteName} — {dict.footer.rights}
          </p>
          <div className="flex gap-4">
            <span>{dict.footer.terms}</span>
            <span>{dict.footer.privacy}</span>
            <span>{dict.footer.sla}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
