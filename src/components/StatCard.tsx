import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  Icon,
  label,
  value,
  href,
  tone = "var(--brand)",
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  tone?: string;
}) {
  const content = (
    <>
      <span
        className="flex size-10 items-center justify-center rounded-xl"
        style={{ background: "var(--surface-sunken)", color: tone }}
        aria-hidden
      >
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-lg font-extrabold">{value}</p>
      </div>
    </>
  );

  const className = "card flex items-center gap-3.5 p-4 transition-transform hover:-translate-y-0.5";
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
