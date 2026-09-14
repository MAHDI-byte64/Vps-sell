import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LifeBuoy, RefreshCw } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { openSecret } from "@/lib/crypto";
import { daysUntil, formatDate, formatMoney, formatNumber, formatRam, formatBandwidth } from "@/lib/format";
import { countryFlag, locationCity, planName } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { CopyField } from "@/components/CopyField";
import { renewServiceAction, toggleAutoRenewAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/services/${id}`);
  const settings = await getSettings();

  // Scoping by userId is what stops one customer reading another's credentials.
  const service = await prisma.service.findFirst({
    where: { id, userId: user.id },
    include: { location: true, os: true, plan: true },
  });
  if (!service) notFound();

  const password = openSecret(service.passwordEnc);
  const left = daysUntil(service.expiresAt);
  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;
  const delivered = service.status !== "PENDING" && Boolean(service.ipv4);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/services`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.services.title}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold">{service.label}</h1>
        <Badge tone={statusTone[service.status]}>{dict.serviceStatus[service.status]}</Badge>
        {left !== null && left <= 14 && service.status === "ACTIVE" && (
          <Badge tone={left <= 3 ? "danger" : "warn"}>
            {left > 0 ? `${formatNumber(left, locale)} ${dict.services.daysLeft}` : dict.services.expired}
          </Badge>
        )}
      </header>

      {!delivered && <Alert variant="info">{dict.services.pendingNote}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------------- credentials -------------------------- */}
        <section className="card p-5">
          <h2 className="font-bold">{dict.services.credentials}</h2>
          {delivered ? (
            <div className="mt-4 flex flex-col gap-2.5">
              <CopyField
                label={dict.services.ip}
                value={service.ipv4 ?? "—"}
                copyLabel={dict.services.copy}
                copiedLabel={dict.services.copied}
              />
              {service.ipv6 && (
                <CopyField
                  label="IPv6"
                  value={service.ipv6}
                  copyLabel={dict.services.copy}
                  copiedLabel={dict.services.copied}
                />
              )}
              <CopyField
                label={dict.services.username}
                value={service.username}
                copyLabel={dict.services.copy}
                copiedLabel={dict.services.copied}
              />
              {password && (
                <CopyField
                  label={dict.services.password}
                  value={password}
                  secret
                  copyLabel={dict.services.copy}
                  copiedLabel={dict.services.copied}
                  showLabel={dict.services.showPassword}
                  hideLabel={dict.services.hidePassword}
                />
              )}
              <CopyField
                label={dict.services.sshPort}
                value={String(service.sshPort)}
                copyLabel={dict.services.copy}
                copiedLabel={dict.services.copied}
              />
              {service.hostname && (
                <CopyField
                  label={dict.plans.hostname}
                  value={service.hostname}
                  copyLabel={dict.services.copy}
                  copiedLabel={dict.services.copied}
                />
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {dict.services.pendingNote}
            </p>
          )}

          {service.adminNote && (
            <div className="mt-5 border-t pt-4">
              <h3 className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                {dict.services.adminNote}
              </h3>
              <p className="mt-1.5 text-sm leading-7">{service.adminNote}</p>
            </div>
          )}
        </section>

        {/* ---------------------------- details ---------------------------- */}
        <section className="card p-5">
          <h2 className="font-bold">{dict.services.details}</h2>
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            <Row label={dict.services.plan}>{planName(service.plan, locale)}</Row>
            <Row label={dict.plans.cpu}>
              {formatNumber(service.plan.cpuCores, locale)} {dict.plans.core}
            </Row>
            <Row label={dict.plans.ram}>{formatRam(service.plan.ramMb, locale)}</Row>
            <Row label={dict.plans.disk}>
              {formatNumber(service.plan.diskGb, locale)}{" "}
              {locale === "fa" ? "گیگابایت" : "GB"} {service.plan.diskType}
            </Row>
            <Row label={dict.plans.bandwidth}>
              {formatBandwidth(service.plan.bandwidthGb, locale)}
            </Row>
            <Row label={dict.services.location}>
              <span aria-hidden>{countryFlag(service.location.countryCode)}</span>{" "}
              {locationCity(service.location, locale)}
            </Row>
            <Row label={dict.services.os}>{service.os.name}</Row>
            <Row label={dict.services.expires}>{formatDate(service.expiresAt, locale)}</Row>
            <Row label={dict.services.price}>
              {formatMoney(service.price, locale, settings.usdRate)} /{" "}
              {dict.cycles[service.billingCycle]}
            </Row>
            <Row label={dict.services.autoRenew}>
              {service.autoRenew ? dict.common.yes : dict.common.no}
            </Row>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            {service.status !== "TERMINATED" && (
              <form action={renewServiceAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="serviceId" value={service.id} />
                <button type="submit" className="btn btn-primary btn-sm">
                  <RefreshCw size={15} aria-hidden />
                  {dict.services.renew}
                </button>
              </form>
            )}
            <form action={toggleAutoRenewAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="serviceId" value={service.id} />
              <button type="submit" className="btn btn-outline btn-sm">
                {dict.services.autoRenew}: {service.autoRenew ? dict.common.yes : dict.common.no}
              </button>
            </form>
            <Link
              href={`/${locale}/dashboard/tickets/new?service=${service.id}`}
              className="btn btn-ghost btn-sm"
            >
              <LifeBuoy size={15} aria-hidden />
              {dict.services.openTicket}
            </Link>
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
            {dict.services.renewNote}
          </p>
        </section>
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
