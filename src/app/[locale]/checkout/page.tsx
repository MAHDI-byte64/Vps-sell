import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { readCart } from "@/lib/cart";
import { priceCart } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { locationCity, planName } from "@/lib/catalog";
import { Alert } from "@/components/ui/Alert";
import { CheckoutForm } from "./CheckoutForm";
import { placeOrderAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
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

  const user = await requireUser(locale, `/${locale}/checkout`);
  const [settings, cart] = await Promise.all([getSettings(), readCart()]);
  const priced = await priceCart(cart, settings.cycleDiscounts, settings.taxPercent, user.id);

  if (priced.lines.length === 0) redirect(`/${locale}/cart`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-extrabold">{dict.checkout.title}</h1>

      {error === "balance" && (
        <div className="mt-5">
          <Alert variant="error">{dict.checkout.walletInsufficient}</Alert>
        </div>
      )}
      {error === "invalid" && (
        <div className="mt-5">
          <Alert variant="error">{dict.common.error}</Alert>
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm
            locale={locale}
            dict={dict}
            total={priced.total}
            walletBalance={user.walletBalance}
            usdRate={settings.usdRate}
            cardNumber={settings.cardNumber}
            cardHolder={settings.cardHolder}
            action={placeOrderAction}
          />
        </div>

        <aside className="lg:col-span-1">
          <div className="card sticky top-20 p-5">
            <h2 className="font-bold">{dict.checkout.summary}</h2>

            <ul className="mt-5 flex flex-col gap-3.5 border-b pb-5">
              {priced.lines.map((line, index) => (
                <li key={`${line.plan.id}-${index}`} className="text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{planName(line.plan, locale)}</span>
                    <span className="shrink-0 font-semibold">
                      {formatMoney(line.lineTotal, locale, settings.usdRate)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    {locationCity(line.location, locale)} · {line.os.name} ·{" "}
                    {dict.cycles[line.item.cycle]}
                    {line.item.quantity > 1 ? ` · ×${line.item.quantity}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt style={{ color: "var(--text-muted)" }}>{dict.cart.subtotal}</dt>
                <dd className="font-semibold">
                  {formatMoney(priced.subtotal, locale, settings.usdRate)}
                </dd>
              </div>
              {priced.discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt style={{ color: "var(--text-muted)" }}>
                    {dict.cart.discount}
                    {priced.coupon ? ` (${priced.coupon.code})` : ""}
                  </dt>
                  <dd className="font-semibold" style={{ color: "var(--ok)" }}>
                    − {formatMoney(priced.discount, locale, settings.usdRate)}
                  </dd>
                </div>
              )}
              {priced.tax > 0 && (
                <div className="flex items-center justify-between">
                  <dt style={{ color: "var(--text-muted)" }}>{dict.cart.tax}</dt>
                  <dd className="font-semibold">
                    {formatMoney(priced.tax, locale, settings.usdRate)}
                  </dd>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-4">
                <dt className="font-bold">{dict.cart.total}</dt>
                <dd className="text-xl font-extrabold" style={{ color: "var(--brand)" }}>
                  {formatMoney(priced.total, locale, settings.usdRate)}
                </dd>
              </div>
            </dl>

            <Link href={`/${locale}/cart`} className="btn btn-ghost btn-sm mt-4 w-full">
              {dict.common.back}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
