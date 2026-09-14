"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CreditCard, Globe, Wallet } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatMoney, localizeDigits } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";

type Method = "WALLET" | "GATEWAY" | "CARD_TRANSFER";

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending || disabled}>
      {label}
    </button>
  );
}

export function CheckoutForm({
  locale,
  dict,
  total,
  walletBalance,
  usdRate,
  cardNumber,
  cardHolder,
  action,
}: {
  locale: Locale;
  dict: Dictionary;
  total: number;
  walletBalance: number;
  usdRate: number;
  cardNumber: string;
  cardHolder: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const walletCovers = walletBalance >= total;
  const [method, setMethod] = useState<Method>(walletCovers ? "WALLET" : "GATEWAY");
  const [agreed, setAgreed] = useState(false);

  const methods: {
    id: Method;
    Icon: typeof Wallet;
    title: string;
    note: string;
    disabled?: boolean;
  }[] = [
    {
      id: "WALLET",
      Icon: Wallet,
      title: dict.checkout.wallet,
      note: `${dict.checkout.walletBalance}: ${formatMoney(walletBalance, locale, usdRate)}`,
      disabled: !walletCovers,
    },
    { id: "GATEWAY", Icon: Globe, title: dict.checkout.gateway, note: dict.checkout.gatewayNote },
    {
      id: "CARD_TRANSFER",
      Icon: CreditCard,
      title: dict.checkout.cardTransfer,
      note: dict.checkout.cardTransferNote,
    },
  ];

  return (
    <form action={action} className="card p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="method" value={method} />

      <h2 className="font-bold">{dict.checkout.payWith}</h2>

      <div className="mt-5 flex flex-col gap-3">
        {methods.map((option) => {
          const selected = method === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !option.disabled && setMethod(option.id)}
              disabled={option.disabled}
              aria-pressed={selected}
              className="flex items-start gap-3.5 rounded-xl border p-4 text-start transition-colors disabled:opacity-55"
              style={{
                borderColor: selected ? "var(--brand)" : "var(--line)",
                background: selected ? "var(--brand-soft)" : "var(--surface-sunken)",
              }}
            >
              <span
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: selected ? "var(--brand)" : "var(--surface-raised)",
                  color: selected ? "var(--brand-contrast)" : "var(--text-muted)",
                }}
                aria-hidden
              >
                <option.Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{option.title}</span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                  {option.note}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!walletCovers && method === "WALLET" && (
        <div className="mt-4">
          <Alert variant="warning">{dict.checkout.walletInsufficient}</Alert>
        </div>
      )}

      {method === "CARD_TRANSFER" && (
        <div className="mt-5 rounded-xl border p-4" style={{ background: "var(--surface-sunken)" }}>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--text-muted)" }}>{dict.checkout.cardNumber}</dt>
              <dd className="mono font-bold" style={{ color: "var(--brand)" }}>
                {localizeDigits(cardNumber, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt style={{ color: "var(--text-muted)" }}>{dict.checkout.cardHolder}</dt>
              <dd className="font-bold">{cardHolder}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-2.5">
              <dt style={{ color: "var(--text-muted)" }}>{dict.cart.total}</dt>
              <dd className="font-extrabold" style={{ color: "var(--brand)" }}>
                {formatMoney(total, locale, usdRate)}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <label className="label" htmlFor="reference">
              {dict.checkout.reference}
            </label>
            <input
              id="reference"
              name="reference"
              type="text"
              className="input ltr-text"
              maxLength={80}
              required
              dir="ltr"
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        <label className="label" htmlFor="note">
          {dict.checkout.note}
        </label>
        <textarea id="note" name="note" className="textarea" maxLength={500} rows={3} />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
        />
        <span style={{ color: "var(--text-muted)" }}>{dict.checkout.agree}</span>
      </label>

      <div className="mt-5">
        <SubmitButton
          label={dict.checkout.placeOrder}
          disabled={!agreed || (method === "WALLET" && !walletCovers)}
        />
        {!agreed && (
          <p className="mt-2 text-center text-xs" style={{ color: "var(--text-faint)" }}>
            {dict.checkout.mustAgree}
          </p>
        )}
      </div>
    </form>
  );
}
