import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { openSecret } from "@/lib/crypto";
import { formatDate, formatMoney } from "@/lib/format";
import { locationCity, planName } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { DeliverForm } from "./DeliverForm";
import { deliverServiceAction, setServiceStatusAction } from "../../actions";
import type { ServiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRANSITIONS: ServiceStatus[] = ["ACTIVE", "SUSPENDED", "EXPIRED", "TERMINATED"];

export default async function AdminServiceDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const flags = await searchParams;
  const settings = await getSettings();

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      plan: true,
      location: true,
      os: true,
      orderItem: { include: { order: { select: { id: true, number: true } } } },
    },
  });
  if (!service) notFound();

  const password = openSecret(service.passwordEnc);
  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/admin/services`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.admin.services}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold">{service.label}</h1>
        <Badge tone={statusTone[service.status]}>{dict.serviceStatus[service.status]}</Badge>
      </header>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <DeliverForm
          locale={locale}
          dict={dict}
          service={{
            id: service.id,
            ipv4: service.ipv4,
            ipv6: service.ipv6,
            username: service.username,
            sshPort: service.sshPort,
            hostname: service.hostname,
            adminNote: service.adminNote,
            isWindows: service.os.family === "windows",
          }}
          action={deliverServiceAction}
        />

        <div className="flex flex-col gap-6">
          {/* --------------------------- customer -------------------------- */}
          <section className="card p-5">
            <h2 className="font-bold">{dict.admin.customer}</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label={dict.auth.name}>
                <Link href={`/${locale}/admin/users/${service.user.id}`} className="link">
                  {service.user.name}
                </Link>
              </Row>
              <Row label={dict.auth.email}>
                <span className="ltr-text">{service.user.email}</span>
              </Row>
              {service.user.phone && (
                <Row label={dict.auth.phone}>
                  <span className="ltr-text">{service.user.phone}</span>
                </Row>
              )}
              {service.orderItem && (
                <Row label={dict.admin.orders}>
                  <Link
                    href={`/${locale}/admin/orders/${service.orderItem.order.id}`}
                    className="link mono"
                  >
                    {service.orderItem.order.number}
                  </Link>
                </Row>
              )}
            </dl>
          </section>

          {/* ---------------------------- details -------------------------- */}
          <section className="card p-5">
            <h2 className="font-bold">{dict.services.details}</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label={dict.services.plan}>{planName(service.plan, locale)}</Row>
              <Row label={dict.services.location}>{locationCity(service.location, locale)}</Row>
              <Row label={dict.services.os}>{service.os.name}</Row>
              <Row label={dict.services.expires}>{formatDate(service.expiresAt, locale)}</Row>
              <Row label={dict.services.price}>
                {formatMoney(service.price, locale, settings.usdRate)} /{" "}
                {dict.cycles[service.billingCycle]}
              </Row>
              {password && (
                <Row label={dict.services.password}>
                  <code className="mono">{password}</code>
                </Row>
              )}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              {TRANSITIONS.filter((value) => value !== service.status).map((value) => (
                <form key={value} action={setServiceStatusAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="status" value={value} />
                  <button
                    type="submit"
                    className="btn btn-outline btn-sm"
                    style={
                      value === "TERMINATED" || value === "SUSPENDED"
                        ? { color: "var(--danger)" }
                        : undefined
                    }
                  >
                    {dict.serviceStatus[value]}
                  </button>
                </form>
              ))}
            </div>
          </section>
        </div>
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
