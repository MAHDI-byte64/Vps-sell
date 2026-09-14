"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Server, ShieldCheck, ShoppingCart, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { CurrentUser } from "@/lib/auth";

export function Header({
  locale,
  dict,
  user,
  cartCount,
  siteName,
  logoutAction,
}: {
  locale: Locale;
  dict: Dictionary;
  user: CurrentUser | null;
  cartCount: number;
  siteName: string;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/plans`, label: dict.nav.plans },
    { href: `/${locale}/blog`, label: dict.nav.blog },
    { href: `/${locale}/faq`, label: dict.nav.faq },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2 font-extrabold">
          <span
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
            aria-hidden
          >
            <Server size={18} />
          </span>
          <span className="text-base">{siteName}</span>
        </Link>

        <nav className="mx-2 hidden flex-1 items-center gap-1 lg:flex" aria-label={dict.nav.menu}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                color: isActive(link.href) ? "var(--brand)" : "var(--text-muted)",
                background: isActive(link.href) ? "var(--brand-soft)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle label={dict.nav.theme} />

          <Link
            href={`/${locale}/cart`}
            className="btn btn-ghost btn-sm relative"
            aria-label={dict.nav.cart}
          >
            <ShoppingCart size={17} aria-hidden />
            {cartCount > 0 && (
              <span
                className="absolute -top-0.5 end-0 flex size-4 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
              >
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-1 sm:flex">
              {user.role === "ADMIN" && (
                <Link href={`/${locale}/admin`} className="btn btn-ghost btn-sm gap-1.5">
                  <ShieldCheck size={16} aria-hidden />
                  <span className="hidden md:inline">{dict.nav.admin}</span>
                </Link>
              )}
              <Link href={`/${locale}/dashboard`} className="btn btn-outline btn-sm gap-1.5">
                <LayoutDashboard size={16} aria-hidden />
                <span className="hidden md:inline">{dict.nav.dashboard}</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-ghost btn-sm" aria-label={dict.nav.logout}>
                  <LogOut size={16} aria-hidden />
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link href={`/${locale}/login`} className="btn btn-ghost btn-sm">
                {dict.nav.login}
              </Link>
              <Link href={`/${locale}/register`} className="btn btn-primary btn-sm">
                {dict.nav.register}
              </Link>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={dict.nav.menu}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t lg:hidden" style={{ background: "var(--surface-raised)" }}>
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold"
                style={{
                  color: isActive(link.href) ? "var(--brand)" : "var(--text)",
                  background: isActive(link.href) ? "var(--brand-soft)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-wrap gap-2 border-t pt-3">
              {user ? (
                <>
                  <Link
                    href={`/${locale}/dashboard`}
                    onClick={() => setOpen(false)}
                    className="btn btn-outline btn-sm"
                  >
                    {dict.nav.dashboard}
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href={`/${locale}/admin`}
                      onClick={() => setOpen(false)}
                      className="btn btn-outline btn-sm"
                    >
                      {dict.nav.admin}
                    </Link>
                  )}
                  <form action={logoutAction}>
                    <button type="submit" className="btn btn-ghost btn-sm">
                      {dict.nav.logout}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setOpen(false)}
                    className="btn btn-outline btn-sm"
                  >
                    {dict.nav.login}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    onClick={() => setOpen(false)}
                    className="btn btn-primary btn-sm"
                  >
                    {dict.nav.register}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
