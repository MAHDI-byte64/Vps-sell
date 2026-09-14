import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { MIN_TOPUP } from "@/lib/constants";
import { topUpAction } from "./actions";

export const dynamic = "force-dynamic";

const QUICK_AMOUNTS = [200_000, 500_000, 1_000_000, 2_000_000];

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const { error } = await searchParams;

  const user = await requireUser(locale, `/${locale}/dashboard/wallet`);
  const settings = await getSettings();

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.wallet.title}</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------- balance ---------------------------- */}
        <div
          className="card flex flex-col justify-center p-6"
          style={{ borderColor: "var(--brand)" }}
        >
          <div className="flex items-center gap-2.5">
            <Wallet size={18} style={{ color: "var(--brand)" }} aria-hidden />
            <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              {dict.wallet.balance}
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold" style={{ color: "var(--brand)" }}>
            {formatMoney(user.walletBalance, locale, settings.usdRate)}
          </p>
        </div>

        {/* ----------------------------- top up ---------------------------- */}
        <form action={topUpAction} className="card p-6 lg:col-span-2">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="font-bold">{dict.wallet.topUp}</h2>

          {error === "amount" && (
            <div className="mt-4">
              <Alert variant="error">{dict.wallet.minAmount}</Alert>
            </div>
          )}

          <div className="mt-5">
            <label className="label" htmlFor="amount">
              {dict.wallet.amount}
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              className="input ltr-text"
              min={MIN_TOPUP}
              step={10_000}
              defaultValue={500_000}
              required
              dir="ltr"
              placeholder={dict.wallet.amountPlaceholder}
            />
            <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
              {dict.wallet.minAmount}
            </p>
          </div>

          <fieldset className="mt-4">
            <legend className="label">{dict.wallet.quickAmounts}</legend>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="submit"
                  name="amount"
                  value={amount}
                  className="btn btn-outline btn-sm"
                >
                  {formatMoney(amount, locale, settings.usdRate)}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn btn-primary mt-5 w-full sm:w-auto">
            {dict.wallet.submit}
          </button>
        </form>
      </div>

      {/* --------------------------- transactions -------------------------- */}
      <section>
        <h2 className="mb-4 font-bold">{dict.wallet.history}</h2>
        {transactions.length === 0 ? (
          <EmptyState icon={<Wallet size={26} />} title={dict.wallet.empty} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{dict.wallet.date}</th>
                  <th>{dict.wallet.type}</th>
                  <th>{dict.wallet.description}</th>
                  <th>{dict.wallet.change}</th>
                  <th>{dict.wallet.balanceAfter}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap">{formatDateTime(tx.createdAt, locale)}</td>
                    <td>
                      <Badge tone={tx.amount >= 0 ? "ok" : "muted"}>
                        {dict.walletTypes[tx.type]}
                      </Badge>
                    </td>
                    <td>{tx.description}</td>
                    <td
                      className="font-semibold whitespace-nowrap"
                      style={{ color: tx.amount >= 0 ? "var(--ok)" : "var(--danger)" }}
                    >
                      {tx.amount >= 0 ? "+" : "−"}{" "}
                      {formatMoney(Math.abs(tx.amount), locale, settings.usdRate)}
                    </td>
                    <td className="font-semibold whitespace-nowrap">
                      {formatMoney(tx.balanceAfter, locale, settings.usdRate)}
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
