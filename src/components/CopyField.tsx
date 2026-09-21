"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

/**
 * A read-only credential row with copy-to-clipboard, and optional masking for
 * secrets. Values render LTR so an IP or password never reverses inside RTL copy.
 */
export function CopyField({
  label,
  value,
  secret = false,
  copyLabel,
  copiedLabel,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  secret?: boolean;
  copyLabel: string;
  copiedLabel: string;
  showLabel?: string;
  hideLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be denied; the value is selectable either way.
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border p-3" style={{ background: "var(--surface-sunken)" }}>
      <span className="w-24 shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <code className="mono min-w-0 flex-1 truncate text-sm font-semibold">
        {revealed ? value : "••••••••••••"}
      </code>
      {secret && (
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="btn btn-ghost btn-sm"
          aria-label={revealed ? hideLabel : showLabel}
        >
          {revealed ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        className="btn btn-ghost btn-sm"
        aria-label={copied ? copiedLabel : copyLabel}
      >
        {copied ? (
          <Check size={15} style={{ color: "var(--ok)" }} aria-hidden />
        ) : (
          <Copy size={15} aria-hidden />
        )}
      </button>
    </div>
  );
}
