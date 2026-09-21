"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({ items }: { items: readonly { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-4 text-start text-sm font-bold"
            >
              <span className="flex-1">{item.q}</span>
              <ChevronDown
                size={18}
                className="shrink-0 transition-transform"
                style={{
                  color: "var(--brand)",
                  transform: open ? "rotate(180deg)" : "none",
                }}
                aria-hidden
              />
            </button>
            {open && (
              <p
                className="border-t px-5 py-4 text-sm leading-8"
                style={{ color: "var(--text-muted)" }}
              >
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
