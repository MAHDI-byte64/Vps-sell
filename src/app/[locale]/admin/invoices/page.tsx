import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { FilterTabs } from "@/components/admin/FilterTabs";
import { markInvoicePaidAction } from "../actions";
import type { InvoiceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: InvoiceStatus[] = ["UNPAID", "PAID", "CANCELLED", "REFUNDED"];

export default async function AdminInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; done?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const query = await searchParams;
  const active = STATUSES.includes(query.status as InvoiceStatus)
    ? (query.status as InvoiceStatus)
    : undefined;
  const settings = await getSettings();

  const search = query.q?.trim();

  const [invoices, counts] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        ...(active ? { status: active } : {}),
        ...(search
          ? {
              OR: [
                { number: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } },
                { user: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invoice.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (value: InvoiceStatus) =>
    counts.find((row) => row.status === value)?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.invoices}</h1>

      {query.done && <Alert variant="success">{dict.admin.saved}</Alert>}

      <div className="flex flex-col gap-4">
        <FilterTabs
          basePath={`/${locale}/admin/invoices`}
          current={active}
          allLabel={dict.admin.all}
          options={STATUSES.map((value) => ({
            value,
            label: dict.invoiceStatus[value],
            count: countOf(value),
          }))}
        />

        <form className="flex gap-2" action={`/${locale}/admin/invoices`}>
          {active && <input type="hidden" name="status" value={active} />}
          <input
            name="q"
            type="search"
            className="input max-w-xs"
            placeholder={dict.admin.searchPlaceholder}
            defaultValue={search ?? ""}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            {dict.admin.search}
          </button>
        </form>
      </div>

      {invoices.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.invoices.number}</th>
                <th>{dict.admin.customer}</th>
                <th>{dict.invoices.description}</th>
                <th>{dict.admin.amount}</th>
                <th>{dict.admin.status}</th>
                <th>{dict.admin.date}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono font-semibold">{invoice.number}</td>
                  <td>
                    <Link
                      href={`/${locale}/admin/users/${invoice.user.id}`}
                      className="link font-semibold"
                    >
                      {invoice.user.name}
                    </Link>
                    <span className="ltr-text block text-xs" style={{ color: "var(--text-faint)" }}>
                      {invoice.user.email}
                    </span>
                  </td>
                  <td>{dict.invoiceTypes[invoice.type]}</td>
                  <td className="font-semibold whitespace-nowrap">
                    {formatMoney(invoice.total, locale, settings.usdRate)}
                  </td>
                  <td>
                    <Badge tone={statusTone[invoice.status]}>
                      {dict.invoiceStatus[invoice.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(invoice.createdAt, locale)}</td>
                  <td>
                    {invoice.status === "UNPAID" && (
                      <form action={markInvoicePaidAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" className="btn btn-outline btn-sm">
                          {dict.admin.markPaid}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
