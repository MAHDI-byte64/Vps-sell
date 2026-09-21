import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { confirmPaymentAction, rejectPaymentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const { done } = await searchParams;
  const settings = await getSettings();

  const [pending, recent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        invoice: { select: { id: true, number: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: { not: "PENDING" } },
      include: {
        user: { select: { name: true } },
        invoice: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.payments}</h1>

      {done && <Alert variant="success">{dict.admin.saved}</Alert>}

      {/* ------------------------ awaiting confirmation ------------------- */}
      <section>
        <h2 className="mb-4 font-bold">{dict.admin.pendingPaymentsTitle}</h2>

        {pending.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.admin.noPendingPayments}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((payment) => (
              <div
                key={payment.id}
                className="card p-5"
                style={{ borderColor: "var(--warn)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {formatMoney(payment.amount, locale, settings.usdRate)}
                      <span className="ms-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                        {dict.paymentMethods[payment.method]}
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm">
                      <Link href={`/${locale}/admin/users/${payment.user.id}`} className="link">
                        {payment.user.name}
                      </Link>
                      <span className="ltr-text ms-2" style={{ color: "var(--text-faint)" }}>
                        {payment.user.email}
                      </span>
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                      <Link
                        href={`/${locale}/admin/invoices?q=${payment.invoice.number}`}
                        className="mono link"
                      >
                        {payment.invoice.number}
                      </Link>
                      {" · "}
                      {formatDateTime(payment.createdAt, locale)}
                    </p>
                    {payment.reference && (
                      <p className="mt-2 text-sm">
                        <span style={{ color: "var(--text-muted)" }}>
                          {dict.invoices.reference}:
                        </span>{" "}
                        <span className="mono font-bold">{payment.reference}</span>
                      </p>
                    )}
                    {payment.receiptNote && (
                      <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {payment.receiptNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={confirmPaymentAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <button type="submit" className="btn btn-primary btn-sm">
                        {dict.admin.approve}
                      </button>
                    </form>
                    <form action={rejectPaymentAction} className="flex gap-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input
                        name="reason"
                        type="text"
                        className="input w-40 py-1.5 text-xs"
                        placeholder={dict.admin.reason}
                        maxLength={300}
                      />
                      <button type="submit" className="btn btn-outline btn-sm" style={{ color: "var(--danger)" }}>
                        {dict.admin.reject}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------- history ---------------------------- */}
      <section>
        <h2 className="mb-4 font-bold">{dict.invoices.paymentHistory}</h2>
        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.admin.noResults}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{dict.invoices.number}</th>
                  <th>{dict.admin.customer}</th>
                  <th>{dict.invoices.method}</th>
                  <th>{dict.admin.amount}</th>
                  <th>{dict.admin.status}</th>
                  <th>{dict.admin.date}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((payment) => (
                  <tr key={payment.id}>
                    <td className="mono font-semibold">{payment.invoice.number}</td>
                    <td>{payment.user.name}</td>
                    <td>{dict.paymentMethods[payment.method]}</td>
                    <td className="font-semibold whitespace-nowrap">
                      {formatMoney(payment.amount, locale, settings.usdRate)}
                    </td>
                    <td>
                      <Badge tone={statusTone[payment.status]}>
                        {dict.paymentStatus[payment.status]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      {formatDateTime(payment.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
