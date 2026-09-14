import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/invoices`);
  const settings = await getSettings();

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-extrabold">{dict.invoices.title}</h1>
        <EmptyState icon={<FileText size={26} />} title={dict.invoices.empty} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.invoices.title}</h1>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{dict.invoices.number}</th>
              <th>{dict.invoices.description}</th>
              <th>{dict.invoices.date}</th>
              <th>{dict.invoices.amount}</th>
              <th>{dict.invoices.status}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="mono font-semibold">{invoice.number}</td>
                <td>{dict.invoiceTypes[invoice.type]}</td>
                <td className="whitespace-nowrap">{formatDate(invoice.createdAt, locale)}</td>
                <td className="font-semibold whitespace-nowrap">
                  {formatMoney(invoice.total, locale, settings.usdRate)}
                </td>
                <td>
                  <Badge tone={statusTone[invoice.status]}>
                    {dict.invoiceStatus[invoice.status]}
                  </Badge>
                </td>
                <td>
                  <Link
                    href={`/${locale}/dashboard/invoices/${invoice.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    {invoice.status === "UNPAID" ? dict.invoices.pay : dict.invoices.view}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
