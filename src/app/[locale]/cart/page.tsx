import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart, Tag, Trash2 } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSettings } from "@/lib/settings";
import { readCart } from "@/lib/cart";
import { priceCart, type CouponProblem } from "@/lib/pricing";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { countryFlag, locationCity, planName } from "@/lib/catalog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import {
  applyCouponAction,
  removeCouponAction,
  removeLineAction,
  setQuantityAction,
} from "./actions";

export const dynamic = "force-dynamic";

const COUPON_MESSAGE: Record<CouponProblem, { fa: string; en: string }> = {
  not_found: { fa: "کد تخفیف پیدا نشد.", en: "That coupon does not exist." },
  inactive: { fa: "این کد غیرفعال است.", en: "That coupon is no longer active." },
  expired: { fa: "این کد منقضی شده است.", en: "That coupon has expired." },
  not_started: { fa: "این کد هنوز فعال نشده است.", en: "That coupon is not active yet." },
  exhausted: { fa: "ظرفیت استفاده از این کد تمام شده است.", en: "That coupon has been fully used." },
  already_used: { fa: "قبلاً از این کد استفاده کرده‌اید.", en: "You have already used this coupon." },
  min_order: {
    fa: "مبلغ سفارش برای این کد کافی نیست.",
    en: "Your order does not reach this coupon's minimum.",
  },
  first_order_only: {
    fa: "این کد فقط برای اولین سفارش است.",
    en: "This coupon is only valid on a first order.",
  },
};

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const { added } = await searchParams;

  const [settings, cart, user] = await Promise.all([getSettings(), readCart(), getCurrentUser()]);
  const priced = await priceCart(cart, settings.cycleDiscounts, settings.taxPercent, user?.id);

  if (priced.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-2xl font-extrabold">{dict.cart.title}</h1>
        <EmptyState
          icon={<ShoppingCart size={26} />}
          title={dict.cart.empty}
          action={
            <Link href={`/${locale}/plans`} className="btn btn-primary btn-sm">
              {dict.cart.browsePlans}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-extrabold">{dict.cart.title}</h1>

      {added && (
        <div className="mt-5">
          <Alert variant="success">{dict.cart.itemAdded}</Alert>
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-3">
        {/* ----------------------------- lines ----------------------------- */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {priced.lines.map((line, index) => (
            <div key={`${line.plan.id}-${index}`} className="card flex flex-col gap-4 p-5 sm:flex-row">
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{planName(line.plan, locale)}</h2>
                <dl
                  className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="flex gap-1.5">
                    <dt>{dict.plans.location}:</dt>
                    <dd className="font-semibold">
                      <span aria-hidden>{countryFlag(line.location.countryCode)}</span>{" "}
                      {locationCity(line.location, locale)}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{dict.plans.os}:</dt>
                    <dd className="font-semibold">{line.os.name}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{dict.plans.filterCycle}:</dt>
                    <dd className="font-semibold">{dict.cycles[line.item.cycle]}</dd>
                  </div>
                  {line.item.hostname && (
                    <div className="flex gap-1.5">
                      <dt>{dict.plans.hostname}:</dt>
                      <dd className="mono font-semibold">{line.item.hostname}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex items-center gap-3">
                  <form action={setQuantityAction} className="flex items-center gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="index" value={index} />
                    <label className="text-xs" htmlFor={`qty-${index}`} style={{ color: "var(--text-muted)" }}>
                      {dict.plans.quantity}
                    </label>
                    <select
                      id={`qty-${index}`}
                      name="quantity"
                      defaultValue={line.item.quantity}
                      className="select w-20 py-1.5 text-xs"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-ghost btn-sm">
                      {dict.cart.update}
                    </button>
                  </form>

                  <form action={removeLineAction} className="ms-auto">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="index" value={index} />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--danger)" }}
                      aria-label={dict.cart.remove}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </form>
                </div>
              </div>

              <div className="text-end sm:w-40">
                <p className="text-lg font-extrabold" style={{ color: "var(--brand)" }}>
                  {formatMoney(line.lineTotal, locale, settings.usdRate)}
                </p>
                {line.item.quantity > 1 && (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    {line.item.quantity} × {formatMoney(line.unitPrice, locale, settings.usdRate)}
                  </p>
                )}
                {line.setupFee > 0 && (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    + {dict.plans.setupFee} {formatMoney(line.setupFee, locale, settings.usdRate)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ---------------------------- summary ---------------------------- */}
        <aside className="lg:col-span-1">
          <div className="card sticky top-20 p-5">
            <h2 className="font-bold">{dict.checkout.summary}</h2>

            <form action={applyCouponAction} className="mt-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="label" htmlFor="code">
                {dict.cart.coupon}
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  className="input ltr-text uppercase"
                  placeholder={dict.cart.couponPlaceholder}
                  defaultValue={cart.coupon ?? ""}
                  maxLength={40}
                />
                <button type="submit" className="btn btn-outline btn-sm shrink-0">
                  {dict.cart.apply}
                </button>
              </div>
            </form>

            {priced.couponProblem && (
              <div className="mt-3">
                <Alert variant="error">{COUPON_MESSAGE[priced.couponProblem][locale]}</Alert>
              </div>
            )}
            {priced.coupon && !priced.couponProblem && (
              <div className="mt-3 flex items-center gap-2">
                <span className="badge badge-ok">
                  <Tag size={12} aria-hidden />
                  {priced.coupon.code}
                </span>
                <form action={removeCouponAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="btn btn-ghost btn-sm text-xs">
                    {dict.cart.removeCoupon}
                  </button>
                </form>
              </div>
            )}

            <dl className="mt-5 flex flex-col gap-2.5 border-t pt-5 text-sm">
              <Row label={dict.cart.subtotal}>
                {formatMoney(priced.subtotal, locale, settings.usdRate)}
              </Row>
              {priced.discount > 0 && (
                <Row label={dict.cart.discount} tone="var(--ok)">
                  − {formatMoney(priced.discount, locale, settings.usdRate)}
                </Row>
              )}
              {priced.tax > 0 && (
                <Row label={dict.cart.tax}>{formatMoney(priced.tax, locale, settings.usdRate)}</Row>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-4">
                <dt className="font-bold">{dict.cart.total}</dt>
                <dd className="text-xl font-extrabold" style={{ color: "var(--brand)" }}>
                  {formatMoney(priced.total, locale, settings.usdRate)}
                </dd>
              </div>
            </dl>

            <Link href={`/${locale}/checkout`} className="btn btn-primary btn-lg mt-5 w-full">
              {dict.cart.checkout}
            </Link>
            <Link href={`/${locale}/plans`} className="btn btn-ghost btn-sm mt-2 w-full">
              {dict.cart.continueShopping}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd className="font-semibold" style={tone ? { color: tone } : undefined}>
        {children}
      </dd>
    </div>
  );
}
