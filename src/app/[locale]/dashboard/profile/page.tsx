import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { updatePasswordAction, updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; password?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const flags = await searchParams;
  const user = await requireUser(locale, `/${locale}/dashboard/profile`);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.profile.title}</h1>

      {flags.saved && <Alert variant="success">{dict.profile.saved}</Alert>}
      {flags.password && <Alert variant="success">{dict.profile.passwordUpdated}</Alert>}
      {flags.error === "current" && <Alert variant="error">{dict.profile.wrongCurrentPassword}</Alert>}
      {flags.error === "password" && <Alert variant="error">{dict.auth.passwordMismatch}</Alert>}
      {flags.error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------------- personal --------------------------- */}
        <form action={updateProfileAction} className="card flex flex-col gap-4 p-6">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="font-bold">{dict.profile.personal}</h2>

          <div>
            <label className="label" htmlFor="name">
              {dict.auth.name}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="input"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              {dict.auth.email}
            </label>
            <input
              id="email"
              type="email"
              className="input ltr-text"
              defaultValue={user.email}
              disabled
              dir="ltr"
            />
            <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
              {dict.profile.emailNote}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="phone">
              {dict.auth.phone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="input ltr-text"
              defaultValue={user.phone ?? ""}
              maxLength={20}
              dir="ltr"
            />
          </div>

          <button type="submit" className="btn btn-primary mt-1 self-start">
            {dict.profile.save}
          </button>
        </form>

        {/* -------------------------- password --------------------------- */}
        <form action={updatePasswordAction} className="card flex flex-col gap-4 p-6">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="font-bold">{dict.profile.changePassword}</h2>

          <div>
            <label className="label" htmlFor="currentPassword">
              {dict.profile.currentPassword}
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              className="input ltr-text"
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          <div>
            <label className="label" htmlFor="newPassword">
              {dict.profile.newPassword}
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className="input ltr-text"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">
              {dict.auth.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input ltr-text"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>

          <button type="submit" className="btn btn-primary mt-1 self-start">
            {dict.profile.updatePassword}
          </button>
        </form>
      </div>
    </div>
  );
}
