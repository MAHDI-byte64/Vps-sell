"use client";

import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BillingCycle } from "@/lib/types";
import { CYCLE_ORDER, cycleSaving, priceForCycle, type CycleDiscounts } from "@/lib/billing";
import { formatMoney } from "@/lib/format";

type Option = { id: string; label: string };

/**
 * Configuration happens client-side so the customer sees the price move as they
 * change the cycle or quantity. The server action re-derives every figure from
 * the database, so nothing here is trusted for billing.
 */
export function OrderForm({
  locale,
  dict,
  plan,
  locations,
  operatingSystems,
  discounts,
  usdRate,
  action,
}: {
  locale: Locale;
  dict: Dictionary;
  plan: { id: string; slug: string; priceMonthly: number; setupFee: number; stock: number | null };
  locations: Option[];
  operatingSystems: Option[];
  discounts: CycleDiscounts;
  usdRate: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [quantity, setQuantity] = useState(1);

  const unitPrice = useMemo(
    () => priceForCycle(plan.priceMonthly, cycle, discounts),
    [plan.priceMonthly, cycle, discounts],
  );
  const total = unitPrice * quantity + plan.setupFee * quantity;
  const outOfStock = plan.stock !== null && plan.stock <= 0;

  return (
    <form action={action} className="card p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="cycle" value={cycle} />

      <h2 className="text-lg font-extrabold">{dict.plans.configure}</h2>

      {/* ---------------------------- cycle ---------------------------- */}
      <fieldset className="mt-6">
        <legend className="label">{dict.plans.filterCycle}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CYCLE_ORDER.map((value) => {
            const saving = cycleSaving(plan.priceMonthly, value, discounts);
            const selected = cycle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCycle(value)}
                aria-pressed={selected}
                className="flex flex-col items-start gap-1 rounded-xl border p-3.5 text-start transition-colors"
                style={{
                  borderColor: selected ? "var(--brand)" : "var(--line)",
                  background: selected ? "var(--brand-soft)" : "var(--surface-sunken)",
                }}
              >
                <span className="text-sm font-bold">{dict.cycles[value]}</span>
                <span className="text-sm font-extrabold" style={{ color: "var(--brand)" }}>
                  {formatMoney(priceForCycle(plan.priceMonthly, value, discounts), locale, usdRate)}
                </span>
                {saving > 0 && (
                  <span className="badge badge-ok">
                    {dict.plans.save} {formatMoney(saving, locale, usdRate)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* --------------------------- location --------------------------- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="locationId">
            {dict.plans.location}
          </label>
          <select id="locationId" name="locationId" className="select" required defaultValue={locations[0]?.id}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="osId">
            {dict.plans.os}
          </label>
          <select id="osId" name="osId" className="select" required defaultValue={operatingSystems[0]?.id}>
            {operatingSystems.map((os) => (
              <option key={os.id} value={os.id}>
                {os.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="hostname">
            {dict.plans.hostname}
          </label>
          <input
            id="hostname"
            name="hostname"
            type="text"
            className="input ltr-text"
            placeholder={dict.plans.hostnamePlaceholder}
            pattern="[a-zA-Z0-9.\-]*"
            maxLength={120}
          />
        </div>

        <div>
          <label className="label" htmlFor="quantity">
            {dict.plans.quantity}
          </label>
          <select
            id="quantity"
            name="quantity"
            className="select"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ----------------------------- total ---------------------------- */}
      <div className="mt-6 rounded-xl border p-4" style={{ background: "var(--surface-sunken)" }}>
        {plan.setupFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>{dict.plans.setupFee}</span>
            <span className="font-semibold">
              {formatMoney(plan.setupFee * quantity, locale, usdRate)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{dict.plans.total}</span>
          <span className="text-xl font-extrabold" style={{ color: "var(--brand)" }}>
            {formatMoney(total, locale, usdRate)}
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
          {dict.cycles[cycle]}
        </p>
      </div>

      <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={outOfStock}>
        <ShoppingCart size={18} aria-hidden />
        {outOfStock ? dict.plans.outOfStock : dict.plans.addToCart}
      </button>
    </form>
  );
}
