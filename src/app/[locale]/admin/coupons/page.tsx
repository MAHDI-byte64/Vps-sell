import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { saveCouponAction, toggleCouponAction } from "./actions";

export const dynamic = "force-dynamic";

/** Renders a Date as the yyyy-mm-dd a date input expects. */
function dateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminCouponsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const flags = await searchParams;
  const settings = await getSettings();

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const editing = flags.edit ? coupons.find((coupon) => coupon.id === flags.edit) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.coupons}</h1>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error === "code" && (
        <Alert variant="error">
          {locale === "fa" ? "این کد قبلاً ثبت شده است." : "That code already exists."}
        </Alert>
      )}
      {flags.error === "percent" && (
        <Alert variant="error">
          {locale === "fa" ? "درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد." : "A percentage cannot exceed 100."}
        </Alert>
      )}
      {flags.error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <form key={editing?.id ?? "new"} action={saveCouponAction} className="card flex flex-col gap-5 p-5">
        <input type="hidden" name="locale" value={locale} />
        {editing && <input type="hidden" name="couponId" value={editing.id} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{editing ? dict.admin.edit : dict.admin.create}</h2>
          {editing && (
            <Link href={`/${locale}/admin/coupons`} className="btn btn-ghost btn-sm">
              {dict.admin.cancel}
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={dict.cart.coupon} name="code" defaultValue={editing?.code ?? ""} ltr required />
          <div>
            <label className="label" htmlFor="type">
              {dict.plans.filterType}
            </label>
            <select id="type" name="type" className="select" defaultValue={editing?.type ?? "PERCENT"}>
              <option value="PERCENT">{locale === "fa" ? "درصدی" : "Percent"}</option>
              <option value="FIXED">{locale === "fa" ? "مبلغ ثابت" : "Fixed amount"}</option>
            </select>
          </div>
          <Field
            label={locale === "fa" ? "مقدار (٪ یا تومان)" : "Value (% or Toman)"}
            name="value"
            type="number"
            defaultValue={String(editing?.value ?? 10)}
            required
          />
          <Field
            label={locale === "fa" ? "سقف تخفیف" : "Max discount"}
            name="maxDiscount"
            type="number"
            defaultValue={editing?.maxDiscount ? String(editing.maxDiscount) : ""}
          />

          <Field
            label={locale === "fa" ? "حداقل سفارش" : "Minimum order"}
            name="minOrder"
            type="number"
            defaultValue={editing?.minOrder ? String(editing.minOrder) : ""}
          />
          <Field
            label={locale === "fa" ? "سقف کل استفاده" : "Total use limit"}
            name="maxUses"
            type="number"
            defaultValue={editing?.maxUses ? String(editing.maxUses) : ""}
          />
          <Field
            label={locale === "fa" ? "سقف هر کاربر" : "Per-user limit"}
            name="maxUsesPerUser"
            type="number"
            defaultValue={String(editing?.maxUsesPerUser ?? 1)}
            required
          />
          <Field
            label={dict.common.from}
            name="startsAt"
            type="date"
            defaultValue={dateInputValue(editing?.startsAt ?? null)}
          />

          <Field
            label={dict.common.to}
            name="expiresAt"
            type="date"
            defaultValue={dateInputValue(editing?.expiresAt ?? null)}
          />
          <Field label="توضیح (FA)" name="descriptionFa" defaultValue={editing?.descriptionFa ?? ""} />
          <Field label="Description (EN)" name="descriptionEn" defaultValue={editing?.descriptionEn ?? ""} />
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="active"
              defaultChecked={editing ? editing.active : true}
              className="size-4 accent-[var(--brand)]"
            />
            {dict.common.active}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="firstOrderOnly"
              defaultChecked={editing?.firstOrderOnly ?? false}
              className="size-4 accent-[var(--brand)]"
            />
            {locale === "fa" ? "فقط اولین سفارش" : "First order only"}
          </label>
        </div>

        <button type="submit" className="btn btn-primary self-start">
          {dict.admin.save}
        </button>
      </form>

      {coupons.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{dict.cart.coupon}</th>
                <th>{dict.cart.discount}</th>
                <th>{locale === "fa" ? "استفاده" : "Used"}</th>
                <th>{dict.common.to}</th>
                <th>{dict.admin.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="mono font-bold">{coupon.code}</td>
                  <td className="whitespace-nowrap">
                    {coupon.type === "PERCENT"
                      ? `${formatNumber(coupon.value, locale)}٪`
                      : formatMoney(coupon.value, locale, settings.usdRate)}
                  </td>
                  <td>
                    {formatNumber(coupon.usedCount, locale)}
                    {coupon.maxUses ? ` / ${formatNumber(coupon.maxUses, locale)}` : ""}
                  </td>
                  <td className="whitespace-nowrap">
                    {coupon.expiresAt ? formatDate(coupon.expiresAt, locale) : "—"}
                  </td>
                  <td>
                    <Badge tone={coupon.active ? "ok" : "muted"}>
                      {coupon.active ? dict.common.active : dict.common.inactive}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <a href={`/${locale}/admin/coupons?edit=${coupon.id}`} className="btn btn-outline btn-sm">
                        {dict.admin.edit}
                      </a>
                      <form action={toggleCouponAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="couponId" value={coupon.id} />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          {coupon.active ? dict.admin.deactivate : dict.admin.reactivate}
                        </button>
                      </form>
                    </div>
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

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  ltr,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  ltr?: boolean;
  required?: boolean;
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
        className={`input ${ltr ? "ltr-text" : ""}`}
        defaultValue={defaultValue}
        dir={ltr ? "ltr" : undefined}
        required={required}
      />
    </div>
  );
}
