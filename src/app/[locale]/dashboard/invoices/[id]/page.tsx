import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatMoney, localizeDigits } from "@/lib/format";
import { snapshotName } from "@/lib/catalog";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PrintButton } from "@/components/PrintButton";
import { PayPanel } from "./PayPanel";
import { payInvoiceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ paid?: string; submitted?: string; error?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const flags = await searchParams;

  const user = await requireUser(locale, `/${locale}/dashboard/invoices/${id}`);
  const settings = await getSettings();

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      order: { include: { items: { include: { location: true, os: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;
  const hasPendingPayment = invoice.payments.some((payment) => payment.status === "PENDING");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/invoices`}
        className="btn btn-ghost btn-sm no-print -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.invoices.title}
      </Link>

      {flags.paid && <Alert variant="success">{dict.invoiceStatus.PAID}</Alert>}
      {flags.submitted && (
        <Alert variant="info">
          {locale === "fa"
            ? "رسید شما ثبت شد و پس از تایید پشتیبانی، فاکتور پرداخت‌شده می‌شود."
            : "Your receipt was recorded. The invoice is marked paid once our team confirms it."}
        </Alert>
      )}
      {flags.error === "balance" && <Alert variant="error">{dict.checkout.walletInsufficient}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------- invoice ---------------------------- */}
        <section className="card p-6 lg:col-span-2">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
            <div>
              <h1 className="text-lg font-extrabold">
                {dict.invoices.number}: <span className="mono">{invoice.number}</span>
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                {dict.invoiceTypes[invoice.type]} · {formatDate(invoice.createdAt, locale)}
              </p>
            </div>
            <Badge tone={statusTone[invoice.status]}>{dict.invoiceStatus[invoice.status]}</Badge>
          </header>

          <div className="grid gap-5 border-b py-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                {dict.invoices.billTo}
              </h2>
              <p className="mt-1.5 font-semibold">{user.name}</p>
              <p className="ltr-text mt-0.5" style={{ color: "var(--text-muted)" }}>
                {user.email}
              </p>
            </div>
            <div className="sm:text-end">
              <h2 className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                {dict.invoices.due}
              </h2>
              <p className="mt-1.5 font-semibold">{formatDate(invoice.dueDate, locale)}</p>
              {invoice.paidAt && (
                <p className="mt-0.5" style={{ color: "var(--ok)" }}>
                  {dict.invoices.paidAt}: {formatDate(invoice.paidAt, locale)}
                </p>
              )}
            </div>
          </div>

          {/* ------------------------- line items ------------------------- */}
          <div className="py-5">
            <h2 className="text-sm font-bold">{dict.invoices.items}</h2>
            <div className="table-wrap mt-3">
              <table className="table" style={{ minWidth: "30rem" }}>
                <thead>
                  <tr>
                    <th>{dict.cart.item}</th>
                    <th>{dict.cart.config}</th>
                    <th>{dict.cart.price}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.order ? (
                    invoice.order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-semibold">
                          {snapshotName(item.planSnapshot, locale)}
                          {item.quantity > 1 && ` × ${item.quantity}`}
                        </td>
                        <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {item.location.nameEn} · {item.os.name} ·{" "}
                          {dict.cycles[item.billingCycle]}
                        </td>
                        <td className="font-semibold whitespace-nowrap">
                          {formatMoney(item.lineTotal, locale, settings.usdRate)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="font-semibold">
                        {invoice.description ?? dict.invoiceTypes[invoice.type]}
                      </td>
                      <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                        —
                      </td>
                      <td className="font-semibold whitespace-nowrap">
                        {formatMoney(invoice.subtotal, locale, settings.usdRate)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --------------------------- totals --------------------------- */}
          <dl className="ms-auto flex max-w-xs flex-col gap-2.5 border-t pt-5 text-sm">
            <div className="flex items-center justify-between">
              <dt style={{ color: "var(--text-muted)" }}>{dict.cart.subtotal}</dt>
              <dd className="font-semibold">
                {formatMoney(invoice.subtotal, locale, settings.usdRate)}
              </dd>
            </div>
            {invoice.discount > 0 && (
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--text-muted)" }}>{dict.cart.discount}</dt>
                <dd className="font-semibold" style={{ color: "var(--ok)" }}>
                  − {formatMoney(invoice.discount, locale, settings.usdRate)}
                </dd>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--text-muted)" }}>{dict.cart.tax}</dt>
                <dd className="font-semibold">
                  {formatMoney(invoice.tax, locale, settings.usdRate)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <dt className="font-bold">{dict.cart.total}</dt>
              <dd className="text-lg font-extrabold" style={{ color: "var(--brand)" }}>
                {formatMoney(invoice.total, locale, settings.usdRate)}
              </dd>
            </div>
          </dl>

          {invoice.payments.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <h2 className="text-sm font-bold">{dict.invoices.paymentHistory}</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {invoice.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
                    style={{ background: "var(--surface-sunken)" }}
                  >
                    <span className="font-semibold">{dict.paymentMethods[payment.method]}</span>
                    <Badge tone={statusTone[payment.status]}>
                      {dict.paymentStatus[payment.status]}
                    </Badge>
                    {payment.reference && (
                      <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
                        {payment.reference}
                      </span>
                    )}
                    <span className="ms-auto text-xs" style={{ color: "var(--text-faint)" }}>
                      {formatDateTime(payment.createdAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ------------------------------ pay ------------------------------ */}
        <aside className="no-print lg:col-span-1">
          {invoice.status === "UNPAID" && !hasPendingPayment ? (
            <PayPanel
              locale={locale}
              dict={dict}
              invoiceId={invoice.id}
              total={invoice.total}
              walletBalance={user.walletBalance}
              usdRate={settings.usdRate}
              cardNumber={settings.cardNumber}
              cardHolder={settings.cardHolder}
              action={payInvoiceAction}
            />
          ) : (
            <div className="card p-5">
              <h2 className="font-bold">{dict.invoices.status}</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                {hasPendingPayment
                  ? dict.paymentStatus.PENDING
                  : dict.invoiceStatus[invoice.status]}
              </p>
              {invoice.paidAt && (
                <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                  {localizeDigits(formatDateTime(invoice.paidAt, locale), locale)}
                </p>
              )}
            </div>
          )}

          <div className="mt-3">
            <PrintButton label={dict.invoices.print} />
          </div>
        </aside>
      </div>
    </div>
  );
}
