import "server-only";
import { prisma } from "./db";
import { defaultCycleDiscounts, type CycleDiscounts } from "./billing";

export type SiteSettings = {
  siteName: string;
  /** Toman per 1 USD — drives every English-locale price. */
  usdRate: number;
  taxPercent: number;
  cycleDiscounts: CycleDiscounts;
  supportEmail: string;
  supportPhone: string;
  telegram: string;
  cardNumber: string;
  cardHolder: string;
  addressFa: string;
  addressEn: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "ابرسرور",
  usdRate: 84_000,
  taxPercent: 0,
  cycleDiscounts: defaultCycleDiscounts(),
  supportEmail: "support@abrserver.ir",
  supportPhone: "021-91000000",
  telegram: "abrserver_support",
  cardNumber: "6037-9977-1234-5678",
  cardHolder: "شرکت ابرسرور",
  addressFa: "تهران، خیابان ولیعصر، برج فناوری، طبقه ۱۲",
  addressEn: "Tech Tower, Valiasr St., Tehran, Iran",
};

const SETTINGS_KEY = "site";

/**
 * Settings live in a single JSON row. Reads are merged over the defaults so a
 * newly added field works before anyone has saved the settings form.
 */
export async function getSettings(): Promise<SiteSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return DEFAULT_SETTINGS;
    const stored = row.value as Partial<SiteSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      cycleDiscounts: { ...DEFAULT_SETTINGS.cycleDiscounts, ...(stored.cycleDiscounts ?? {}) },
    };
  } catch {
    // The catalogue should still render if the database is briefly unreachable.
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSettings();
  const next: SiteSettings = {
    ...current,
    ...patch,
    cycleDiscounts: { ...current.cycleDiscounts, ...(patch.cycleDiscounts ?? {}) },
  };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next },
    update: { value: next },
  });
  return next;
}
