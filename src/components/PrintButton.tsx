"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => window.print()}>
      <Printer size={15} aria-hidden />
      {label}
    </button>
  );
}
