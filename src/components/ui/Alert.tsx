import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Variant = "success" | "error" | "info" | "warning";

const styles: Record<Variant, { bg: string; fg: string; Icon: typeof Info }> = {
  success: { bg: "var(--ok-soft)", fg: "var(--ok)", Icon: CheckCircle2 },
  error: { bg: "var(--danger-soft)", fg: "var(--danger)", Icon: XCircle },
  info: { bg: "var(--info-soft)", fg: "var(--info)", Icon: Info },
  warning: { bg: "var(--warn-soft)", fg: "var(--warn)", Icon: AlertTriangle },
};

export function Alert({
  variant = "info",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  const { bg, fg, Icon } = styles[variant];
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
      style={{ background: bg, color: fg }}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon size={17} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
