import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import { locationCity, snapshotName } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const settings = await getSettings();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      coupon: { select: { code: true } },
      invoice: true,
      items: {
        include: {
          location: true,
          os: true,
          services: { select: { id: true, label: true, status: true, ipv4: true } },
        },
      },
    },
  });
  if (!order) notFound();

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/admin/orders`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.admin.orders}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mono text-xl font-extrabold">{order.number}</h1>
        <Badge tone={statusTone[order.status]}>{dict.orderStatus[order.status]}</Badge>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {formatDate(order.createdAt, locale)}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ----------------------------- items ----------------------------- */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold">{dict.invoices.items}</h2>
          <div className="mt-4 flex flex-col gap-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border p-4"
                style={{ background: "var(--surface-sunken)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {snapshotName(item.planSnapshot, locale)}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {locationCity(item.location, locale)} · {item.os.name} ·{" "}
                      {dict.cycles[item.billingCycle]}
                      {item.hostname ? ` · ${item.hostname}` : ""}
                    </p>
                  </div>
                  <p className="font-bold">
                    {formatMoney(item.lineTotal, locale, settings.usdRate)}
                  </p>
                </div>

                {item.services.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {item.services.map((service) => (
                      <li key={service.id}>
                        <Link
                          href={`/${locale}/admin/services/${service.id}`}
                          className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
                          style={{ background: "var(--surface-raised)" }}
                        >
                          <Badge tone={statusTone[service.status]}>
                            {dict.serviceStatus[service.status]}
                          </Badge>
                          <span className="mono">{service.ipv4 ?? service.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <dl className="ms-auto mt-6 flex max-w-xs flex-col gap-2.5 border-t pt-5 text-sm">
            <Row label={dict.cart.subtotal}>
              {formatMoney(order.subtotal, locale, settings.usdRate)}
            </Row>
            {order.discount > 0 && (
              <Row label={`${dict.cart.discount}${order.coupon ? ` (${order.coupon.code})` : ""}`}>
                <span style={{ color: "var(--ok)" }}>
                  − {formatMoney(order.discount, locale, settings.usdRate)}
                </span>
              </Row>
            )}
            {order.tax > 0 && (
              <Row label={dict.cart.tax}>{formatMoney(order.tax, locale, settings.usdRate)}</Row>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <dt className="font-bold">{dict.cart.total}</dt>
              <dd className="text-lg font-extrabold" style={{ color: "var(--brand)" }}>
                {formatMoney(order.total, locale, settings.usdRate)}
              </dd>
            </div>
          </dl>
        </section>

        {/* ---------------------------- customer --------------------------- */}
        <aside className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="font-bold">{dict.admin.customer}</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label={dict.auth.name}>
                <Link href={`/${locale}/admin/users/${order.user.id}`} className="link">
                  {order.user.name}
                </Link>
              </Row>
              <Row label={dict.auth.email}>
                <span className="ltr-text">{order.user.email}</span>
              </Row>
              {order.user.phone && (
                <Row label={dict.auth.phone}>
                  <span className="ltr-text">{order.user.phone}</span>
                </Row>
              )}
            </dl>
          </section>

          {order.invoice && (
            <section className="card p-5">
              <h2 className="font-bold">{dict.admin.invoices}</h2>
              <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                <Row label={dict.invoices.number}>
                  <span className="mono">{order.invoice.number}</span>
                </Row>
                <Row label={dict.admin.status}>
                  <Badge tone={statusTone[order.invoice.status]}>
                    {dict.invoiceStatus[order.invoice.status]}
                  </Badge>
                </Row>
                <Row label={dict.invoices.due}>{formatDate(order.invoice.dueDate, locale)}</Row>
              </dl>
            </section>
          )}

          {order.note && (
            <section className="card p-5">
              <h2 className="font-bold">{dict.checkout.note}</h2>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                {order.note}
              </p>
            </section>
          )}
        </aside>
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
