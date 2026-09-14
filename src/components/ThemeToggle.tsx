"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "vpssell-theme";

/**
 * Three states: "light", "dark", or absent (follow the OS). The toggle only
 * ever writes an explicit choice, which `data-theme` then pins.
 */
export function ThemeToggle({ label }: { label: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = localStorageGet();
    if (stored) {
      setTheme(stored);
      return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can reject writes; the in-memory choice still applies.
    }
  }

  return (
    <button type="button" onClick={toggle} className="btn btn-ghost btn-sm" aria-label={label}>
      {theme === "dark" ? <Moon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
    </button>
  );
}

function localStorageGet(): "light" | "dark" | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Applied before paint so a dark-theme visitor never sees a white flash. Kept
 * as a string because it has to run ahead of React hydration.
 */
export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
