import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Vazirmatn } from "next/font/google";
import { locales, localeMeta, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { themeBootstrapScript } from "@/components/ThemeToggle";
import { logoutAction } from "./actions";

// Vazirmatn carries both Persian and Latin glyphs, so one family covers both
// locales and the layout does not shift when the language is switched.
const appFont = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-app",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: { default: dict.meta.title, template: `%s — ${dict.meta.title.split("|")[0].trim()}` },
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const dict = getDictionary(locale);
  const { dir, htmlLang } = localeMeta[locale];
  const [settings, user, count] = await Promise.all([getSettings(), getCurrentUser(), cartCount()]);

  return (
    <html lang={htmlLang} dir={dir} suppressHydrationWarning className={appFont.variable}>
      <head>
        {/* Runs before first paint so the dark theme never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Header
          locale={locale}
          dict={dict}
          user={user}
          cartCount={count}
          siteName={settings.siteName}
          logoutAction={logoutAction}
        />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} settings={settings} />
      </body>
    </html>
  );
}
