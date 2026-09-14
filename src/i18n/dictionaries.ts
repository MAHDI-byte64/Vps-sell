import { fa, type Dictionary } from "./fa";
import { en } from "./en";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { fa, en };

/**
 * Dictionaries are plain modules rather than dynamic imports: both languages
 * together are a few kilobytes, and keeping them synchronous means server
 * components never await a translation.
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? fa;
}

export type { Dictionary };
