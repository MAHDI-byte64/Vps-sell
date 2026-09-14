import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { adjustWalletAction, toggleUserActiveAction, toggleUserRoleAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const admin = await requireAdmin(locale);
  const flags = await searchParams;
  const settings = await getSettings();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      services: {
        include: { location: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      walletTxs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user) notFound();

  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;
  const isSelf = user.id === admin.id;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/admin/users`}
        className="btn btn-ghost btn-sm -ms-3 self-start"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.admin.users}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold">{user.name}</h1>
        {user.role === "ADMIN" && <Badge tone="brand">{dict.admin.title}</Badge>}
        <Badge tone={user.active ? "ok" : "danger"}>
          {user.active ? dict.common.active : dict.common.inactive}
        </Badge>
      </header>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error === "self" && (
        <Alert variant="error">
          {locale === "fa"
            ? "نمی‌توانید دسترسی حساب خودتان را تغییر دهید."
            : "You cannot change your own account's access."}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------- account ---------------------------- */}
        <section className="card p-5">
          <h2 className="font-bold">{dict.profile.personal}</h2>
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            <Row label={dict.auth.email}>
              <span className="ltr-text">{user.email}</span>
            </Row>
            <Row label={dict.auth.phone}>
              <span className="ltr-text">{user.phone ?? "—"}</span>
            </Row>
            <Row label={dict.dashboard.balance}>
              {formatMoney(user.walletBalance, locale, settings.usdRate)}
            </Row>
            <Row label={dict.admin.date}>{formatDate(user.createdAt, locale)}</Row>
            <Row label="Last login">{formatDateTime(user.lastLoginAt, locale)}</Row>
          </dl>

          {!isSelf && (
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              <form action={toggleUserRoleAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="btn btn-outline btn-sm">
                  {user.role === "ADMIN" ? dict.admin.removeAdmin : dict.admin.makeAdmin}
                </button>
              </form>
              <form action={toggleUserActiveAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="btn btn-outline btn-sm"
                  style={user.active ? { color: "var(--danger)" } : undefined}
                >
                  {user.active ? dict.admin.deactivate : dict.admin.reactivate}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* ----------------------------- wallet ---------------------------- */}
        <section className="card p-5">
          <h2 className="font-bold">{dict.wallet.title}</h2>
          <form action={adjustWalletAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="userId" value={user.id} />
            <div>
              <label className="label" htmlFor="amount">
                {dict.wallet.amount}
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                className="input ltr-text"
                placeholder="500000 / -500000"
                required
                dir="ltr"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
                {locale === "fa"
                  ? "عدد مثبت برای افزایش، منفی برای کاهش."
                  : "Positive to credit, negative to deduct."}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="description">
                {dict.wallet.description}
              </label>
              <input
                id="description"
                name="description"
                type="text"
                className="input"
                maxLength={200}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm self-start">
              {dict.admin.save}
            </button>
          </form>

          {user.walletTxs.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2 border-t pt-4 text-xs">
              {user.walletTxs.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate" style={{ color: "var(--text-muted)" }}>
                    {tx.description}
                  </span>
                  <span
                    className="shrink-0 font-bold"
                    style={{ color: tx.amount >= 0 ? "var(--ok)" : "var(--danger)" }}
                  >
                    {tx.amount >= 0 ? "+" : "−"}{" "}
                    {formatMoney(Math.abs(tx.amount), locale, settings.usdRate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------- services --------------------------- */}
        <section className="card p-5">
          <h2 className="font-bold">{dict.admin.services}</h2>
          {user.services.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {dict.admin.noResults}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {user.services.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/${locale}/admin/services/${service.id}`}
                    className="flex items-center gap-2.5 rounded-xl border p-3 text-sm"
                    style={{ background: "var(--surface-sunken)" }}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{service.label}</span>
                    <span className="mono shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>
                      {service.ipv4 ?? "—"}
                    </span>
                    <Badge tone={statusTone[service.status]}>
                      {dict.serviceStatus[service.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 border-t pt-5 font-bold">{dict.admin.invoices}</h2>
          {user.invoices.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {dict.admin.noResults}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {user.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center gap-2 text-xs">
                  <span className="mono font-semibold">{invoice.number}</span>
                  <span className="ms-auto font-semibold">
                    {formatMoney(invoice.total, locale, settings.usdRate)}
                  </span>
                  <Badge tone={statusTone[invoice.status]}>
                    {dict.invoiceStatus[invoice.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="min-w-0 truncate text-end font-semibold">{children}</dd>
    </div>
  );
}
