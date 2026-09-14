import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "../login/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).auth.registerTitle };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  const { next } = await searchParams;

  const user = await getCurrentUser();
  if (user) redirect(`/${locale}/dashboard`);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="card p-7">
        <h1 className="text-xl font-extrabold">{dict.auth.registerTitle}</h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.auth.registerSubtitle}
        </p>

        <div className="mt-7">
          <AuthForm mode="register" locale={locale} dict={dict} next={next} action={registerAction} />
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.auth.hasAccount}{" "}
          <Link
            href={`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="link"
          >
            {dict.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
