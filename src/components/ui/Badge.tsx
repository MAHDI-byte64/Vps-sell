import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "danger" | "info" | "muted" | "brand";

const toneClass: Record<BadgeTone, string> = {
  ok: "badge-ok",
  warn: "badge-warn",
  danger: "badge-danger",
  info: "badge-info",
  muted: "badge-muted",
  brand: "badge-brand",
};

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge ${toneClass[tone]}`}>{children}</span>;
}

/** Maps every status enum in the app onto a colour, in one place. */
export const statusTone: Record<string, BadgeTone> = {
  // services
  PENDING: "warn",
  ACTIVE: "ok",
  SUSPENDED: "danger",
  EXPIRED: "muted",
  TERMINATED: "muted",
  // invoices / orders
  UNPAID: "warn",
  PAID: "ok",
  CANCELLED: "muted",
  REFUNDED: "info",
  PROVISIONING: "info",
  COMPLETED: "ok",
  // tickets
  OPEN: "warn",
  ANSWERED: "ok",
  CUSTOMER_REPLY: "info",
  CLOSED: "muted",
  // payments
  SUCCESS: "ok",
  FAILED: "danger",
  // priorities
  LOW: "muted",
  NORMAL: "info",
  HIGH: "warn",
  URGENT: "danger",
};
