"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CreditCard, Globe, Wallet } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatMoney, localizeDigits } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";

type Method = "WALLET" | "GATEWAY" | "CARD_TRANSFER";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary mt-4 w-full" disabled={pending}>
      {label}
    </button>
  );
}

/** Pays an already-issued invoice — the same three methods as checkout. */
export function PayPanel({
  locale,
  dict,
  invoiceId,
  total,
  walletBalance,
  usdRate,
  cardNumber,
  cardHolder,
  action,
}: {
  locale: Locale;
  dict: Dictionary;
  invoiceId: string;
  total: number;
  walletBalance: number;
  usdRate: number;
  cardNumber: string;
  cardHolder: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const walletCovers = walletBalance >= total;
  const [method, setMethod] = useState<Method>(walletCovers ? "WALLET" : "GATEWAY");

  const options: { id: Method; Icon: typeof Wallet; title: string; disabled?: boolean }[] = [
    { id: "WALLET", Icon: Wallet, title: dict.checkout.wallet, disabled: !walletCovers },
    { id: "GATEWAY", Icon: Globe, title: dict.checkout.gateway },
    { id: "CARD_TRANSFER", Icon: CreditCard, title: dict.checkout.cardTransfer },
  ];

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="method" value={method} />

      <h2 className="font-bold">{dict.invoices.payInvoice}</h2>
      <p className="mt-1.5 text-2xl font-extrabold" style={{ color: "var(--brand)" }}>
        {formatMoney(total, locale, usdRate)}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {options.map((option) => {
          const selected = method === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !option.disabled && setMethod(option.id)}
              disabled={option.disabled}
              aria-pressed={selected}
              className="flex items-center gap-2.5 rounded-xl border p-3 text-start text-sm font-semibold transition-colors disabled:opacity-55"
              style={{
                borderColor: selected ? "var(--brand)" : "var(--line)",
                background: selected ? "var(--brand-soft)" : "var(--surface-sunken)",
                color: selected ? "var(--brand)" : "var(--text)",
              }}
            >
              <option.Icon size={16} aria-hidden />
              {option.title}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
        {dict.checkout.walletBalance}: {formatMoney(walletBalance, locale, usdRate)}
      </p>

      {!walletCovers && method === "WALLET" && (
        <div className="mt-3">
          <Alert variant="warning">{dict.checkout.walletInsufficient}</Alert>
        </div>
      )}

      {method === "CARD_TRANSFER" && (
        <div className="mt-4 rounded-xl border p-3" style={{ background: "var(--surface-sunken)" }}>
          <p className="mono text-sm font-bold" style={{ color: "var(--brand)" }}>
            {localizeDigits(cardNumber, locale)}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {cardHolder}
          </p>
          <div className="mt-3">
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

      <SubmitButton label={dict.invoices.pay} />
    </form>
  );
}
