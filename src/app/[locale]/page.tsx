import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Gauge,
  HardDrive,
  Headphones,
  LifeBuoy,
  Network,
  Rocket,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatNumber } from "@/lib/format";
import { countryFlag, locationCity, locationName } from "@/lib/catalog";
import { PlanCard } from "@/components/PlanCard";
import { FaqAccordion } from "@/components/FaqAccordion";

// Prices and the featured list are read live, so the homepage renders per
// request rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const settings = await getSettings();

  const [featuredPlans, locations, posts] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { priceMonthly: "asc" }],
      take: 3,
    }),
    prisma.location.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const Arrow = locale === "fa" ? ArrowLeft : ArrowRight;

  const stats = [
    {
      Icon: Gauge,
      value: locale === "fa" ? "٪۹۹٫۹" : "99.9%",
      label: dict.home.statsUptime,
    },
    { Icon: Clock, value: locale === "fa" ? "۱۵ دقیقه" : "15 min", label: dict.home.statsDelivery },
    { Icon: Headphones, value: "24/7", label: dict.home.statsSupport },
    {
      Icon: Users,
      value: locale === "fa" ? "+۱۲٬۰۰۰" : "12,000+",
      label: dict.home.statsClients,
    },
  ];

  const features = [
    { Icon: HardDrive, title: dict.features.nvmeTitle, body: dict.features.nvmeBody },
    { Icon: ShieldCheck, title: dict.features.uptimeTitle, body: dict.features.uptimeBody },
    { Icon: LifeBuoy, title: dict.features.supportTitle, body: dict.features.supportBody },
    { Icon: Rocket, title: dict.features.deliveryTitle, body: dict.features.deliveryBody },
    { Icon: Network, title: dict.features.networkTitle, body: dict.features.networkBody },
    { Icon: Zap, title: dict.features.backupTitle, body: dict.features.backupBody },
  ];

  return (
    <>
      {/* ------------------------------- hero ------------------------------ */}
      <section className="hero-glow relative overflow-hidden border-b">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:py-28">
          <span className="badge badge-brand mx-auto">
            <Zap size={13} aria-hidden />
            {dict.home.badge}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-3xl leading-tight font-extrabold sm:text-5xl sm:leading-[1.15]">
            {dict.home.heroTitle}
          </h1>
          <p
            className="mx-auto mt-5 max-w-2xl text-base leading-8"
            style={{ color: "var(--text-muted)" }}
          >
            {dict.home.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/${locale}/plans`} className="btn btn-primary btn-lg">
              {dict.home.ctaPrimary}
              <Arrow size={18} aria-hidden />
            </Link>
            <Link href={`/${locale}/contact`} className="btn btn-outline btn-lg">
              {dict.home.ctaSecondary}
            </Link>
          </div>

          <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card px-4 py-5">
                <stat.Icon size={20} className="mx-auto" style={{ color: "var(--brand)" }} aria-hidden />
                <dd className="mt-2.5 text-xl font-extrabold">{stat.value}</dd>
                <dt className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ----------------------------- features ---------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeading title={dict.home.featuresTitle} subtitle={dict.home.featuresSubtitle} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card p-6">
              <span
                className="flex size-11 items-center justify-center rounded-xl"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                aria-hidden
              >
                <feature.Icon size={21} />
              </span>
              <h3 className="mt-4 font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------- locations --------------------------- */}
      {locations.length > 0 && (
        <section className="border-y" style={{ background: "var(--surface-raised)" }}>
          <div className="mx-auto max-w-7xl px-4 py-20">
            <SectionHeading title={dict.home.locationsTitle} subtitle={dict.home.locationsSubtitle} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center gap-3 rounded-xl border p-4"
                  style={{ background: "var(--surface-sunken)" }}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {countryFlag(location.countryCode)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{locationCity(location, locale)}</p>
                    <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                      {locationName(location, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------- plans ----------------------------- */}
      {featuredPlans.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20">
          <SectionHeading title={dict.home.plansTitle} subtitle={dict.home.plansSubtitle} />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                locale={locale}
                dict={dict}
                cycle="MONTHLY"
                discounts={settings.cycleDiscounts}
                usdRate={settings.usdRate}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={`/${locale}/plans`} className="btn btn-outline">
              {dict.home.viewAllPlans}
              <Arrow size={16} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* -------------------------------- blog ----------------------------- */}
      {posts.length > 0 && (
        <section className="border-y" style={{ background: "var(--surface-raised)" }}>
          <div className="mx-auto max-w-7xl px-4 py-20">
            <SectionHeading title={dict.home.blogTitle} subtitle={dict.home.blogSubtitle} />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${locale}/blog/${post.slug}`}
                  className="card flex flex-col p-6 transition-transform hover:-translate-y-0.5"
                >
                  <span className="text-3xl" aria-hidden>
                    {post.coverEmoji}
                  </span>
                  <h3 className="mt-3 font-bold">{locale === "fa" ? post.titleFa : post.titleEn}</h3>
                  <p
                    className="mt-2 line-clamp-3 text-sm leading-7"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {locale === "fa" ? post.excerptFa : post.excerptEn}
                  </p>
                  <span className="link mt-4 text-sm">{dict.blog.readMore}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------- faq ------------------------------ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <SectionHeading title={dict.home.faqTitle} subtitle={dict.home.faqSubtitle} />
        <div className="mt-10">
          <FaqAccordion items={dict.faq.items.slice(0, 4)} />
        </div>
      </section>

      {/* -------------------------------- cta ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div
          className="card hero-glow relative overflow-hidden px-6 py-14 text-center"
          style={{ borderColor: "var(--brand)" }}
        >
          <h2 className="text-2xl font-extrabold sm:text-3xl">{dict.home.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {dict.home.ctaBody}
          </p>
          <Link href={`/${locale}/plans`} className="btn btn-primary btn-lg mt-7">
            {dict.home.ctaButton}
            <Arrow size={18} aria-hidden />
          </Link>
          <p className="mt-4 text-xs" style={{ color: "var(--text-faint)" }}>
            {formatNumber(locations.length, locale)}{" "}
            {locale === "fa" ? "لوکیشن فعال" : "active locations"}
          </p>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>
    </div>
  );
}
