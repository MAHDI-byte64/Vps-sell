"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

const schema = z.object({
  siteName: z.string().trim().min(1).max(60),
  usdRate: z.coerce.number().int().min(1).max(10_000_000),
  taxPercent: z.coerce.number().min(0).max(50),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().max(30),
  telegram: z.string().trim().max(40),
  cardNumber: z.string().trim().max(30),
  cardHolder: z.string().trim().max(80),
  addressFa: z.string().trim().max(200),
  addressEn: z.string().trim().max(200),
  discountMonthly: z.coerce.number().int().min(0).max(90),
  discountQuarterly: z.coerce.number().int().min(0).max(90),
  discountSemiannual: z.coerce.number().int().min(0).max(90),
  discountAnnual: z.coerce.number().int().min(0).max(90),
});

export async function saveSettingsAction(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  await requireAdmin(locale);

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/${locale}/admin/settings?error=invalid`);

  const {
    discountMonthly,
    discountQuarterly,
    discountSemiannual,
    discountAnnual,
    ...rest
  } = parsed.data;

  await saveSettings({
    ...rest,
    cycleDiscounts: {
      MONTHLY: discountMonthly,
      QUARTERLY: discountQuarterly,
      SEMIANNUAL: discountSemiannual,
      ANNUAL: discountAnnual,
    },
  });

  // Prices appear on almost every page, so the whole tree is revalidated.
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/settings?saved=1`);
}
