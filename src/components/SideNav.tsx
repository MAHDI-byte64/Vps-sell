"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Newspaper,
  Package,
  Server,
  Settings,
  ShoppingBag,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons are resolved here, inside the client bundle, rather than passed in.
 *
 * lucide-react ships without a "use client" directive, so its components stay
 * in the server graph — neither the component nor an element built from it can
 * cross into a client component's props in a production build. Passing a name
 * keeps the boundary to plain strings.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  server: Server,
  invoice: FileText,
  wallet: Wallet,
  ticket: LifeBuoy,
  user: User,
  users: Users,
  orders: ShoppingBag,
  payments: CreditCard,
  plans: Package,
  coupons: BadgePercent,
  posts: Newspaper,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  exact?: boolean;
};

/**
 * Shared by the customer dashboard and the admin panel. Horizontally
 * scrollable on small screens so it never forces the page to scroll sideways.
 */
export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav className="lg:sticky lg:top-20">
      <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: active ? "var(--brand-soft)" : "transparent",
                  color: active ? "var(--brand)" : "var(--text-muted)",
                }}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden />
                <span>{item.label}</span>
                {item.badge ? (
                  <span
                    className="ms-auto flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                    style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
