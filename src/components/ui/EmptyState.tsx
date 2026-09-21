import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--surface-sunken)", color: "var(--text-faint)" }}
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      {action}
    </div>
  );
}
