import Link from "next/link";
import { notFound } from "next/navigation";
import { Server } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { daysUntil, formatDate, formatMoney, formatNumber } from "@/lib/format";
import { countryFlag, locationCity } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/services`);
  const settings = await getSettings();

  const services = await prisma.service.findMany({
    where: { userId: user.id },
    include: { location: true, os: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  if (services.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-extrabold">{dict.services.title}</h1>
        <EmptyState
          icon={<Server size={26} />}
          title={dict.services.empty}
          action={
            <Link href={`/${locale}/plans`} className="btn btn-primary btn-sm">
              {dict.services.buyFirst}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.services.title}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => {
          const left = daysUntil(service.expiresAt);
          return (
            <Link
              key={service.id}
              href={`/${locale}/dashboard/services/${service.id}`}
              className="card flex flex-col p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate font-bold">{service.label}</h2>
                <Badge tone={statusTone[service.status]}>
                  {dict.serviceStatus[service.status]}
                </Badge>
              </div>

              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <Row label={dict.services.ip}>
                  {service.ipv4 ? (
                    <span className="mono">{service.ipv4}</span>
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>—</span>
                  )}
                </Row>
                <Row label={dict.services.location}>
                  <span aria-hidden>{countryFlag(service.location.countryCode)}</span>{" "}
                  {locationCity(service.location, locale)}
                </Row>
                <Row label={dict.services.os}>{service.os.name}</Row>
                <Row label={dict.services.expires}>
                  {formatDate(service.expiresAt, locale)}
                  {left !== null && left <= 14 && (
                    <span className="ms-2">
                      <Badge tone={left <= 3 ? "danger" : "warn"}>
                        {left > 0
                          ? `${formatNumber(left, locale)} ${dict.services.daysLeft}`
                          : dict.services.expired}
                      </Badge>
                    </span>
                  )}
                </Row>
                <Row label={dict.services.price}>
                  {formatMoney(service.price, locale, settings.usdRate)} /{" "}
                  {dict.cycles[service.billingCycle]}
                </Row>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="min-w-0 truncate text-end font-semibold">{children}</dd>
    </div>
  );
}
