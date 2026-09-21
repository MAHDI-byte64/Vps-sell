import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { CYCLE_ORDER } from "@/lib/billing";
import { Alert } from "@/components/ui/Alert";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const flags = await searchParams;
  const settings = await getSettings();

  const discountFields: Record<string, string> = {
    MONTHLY: "discountMonthly",
    QUARTERLY: "discountQuarterly",
    SEMIANNUAL: "discountSemiannual",
    ANNUAL: "discountAnnual",
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.settings}</h1>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error && <Alert variant="error">{dict.common.error}</Alert>}

      <form action={saveSettingsAction} className="flex flex-col gap-6">
        <input type="hidden" name="locale" value={locale} />

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{dict.admin.settings}</h2>

          <Field label="Site name" name="siteName" defaultValue={settings.siteName} />
          <Field
            label={locale === "fa" ? "نرخ دلار (تومان)" : "USD rate (Toman)"}
            name="usdRate"
            type="number"
            defaultValue={String(settings.usdRate)}
            hint={
              locale === "fa"
                ? "قیمت‌های نسخه انگلیسی با این نرخ محاسبه می‌شوند."
                : "English-locale prices are derived from this rate."
            }
          />
          <Field
            label={locale === "fa" ? "درصد مالیات" : "Tax percent"}
            name="taxPercent"
            type="number"
            step="0.1"
            defaultValue={String(settings.taxPercent)}
          />
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{dict.contact.title}</h2>
          <Field label={dict.contact.email} name="supportEmail" type="email" defaultValue={settings.supportEmail} ltr />
          <Field label={dict.contact.phone} name="supportPhone" defaultValue={settings.supportPhone} ltr />
          <Field label={dict.contact.telegram} name="telegram" defaultValue={settings.telegram} ltr />
          <Field label={dict.checkout.cardNumber} name="cardNumber" defaultValue={settings.cardNumber} ltr />
          <Field label={dict.checkout.cardHolder} name="cardHolder" defaultValue={settings.cardHolder} />
          <Field label={`${dict.contact.address} (FA)`} name="addressFa" defaultValue={settings.addressFa} />
          <Field label={`${dict.contact.address} (EN)`} name="addressEn" defaultValue={settings.addressEn} />
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-4">
          <h2 className="font-bold sm:col-span-4">
            {locale === "fa" ? "تخفیف دوره‌های پرداخت (٪)" : "Billing cycle discounts (%)"}
          </h2>
          {CYCLE_ORDER.map((cycle) => (
            <Field
              key={cycle}
              label={dict.cycles[cycle]}
              name={discountFields[cycle]}
              type="number"
              defaultValue={String(settings.cycleDiscounts[cycle])}
            />
          ))}
        </section>

        <button type="submit" className="btn btn-primary self-start">
          {dict.admin.save}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  hint,
  ltr,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  step?: string;
  hint?: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        className={`input ${ltr ? "ltr-text" : ""}`}
        defaultValue={defaultValue}
        dir={ltr ? "ltr" : undefined}
      />
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
