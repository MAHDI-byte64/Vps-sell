import type { ReactNode } from "react";
import "./globals.css";

/**
 * The real <html> element is rendered by the [locale] layout, which is where
 * `lang` and `dir` are known. This root only exists because Next requires one.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
