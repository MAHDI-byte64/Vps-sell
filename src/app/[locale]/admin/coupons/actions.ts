"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

function optionalDate(value: FormDataEntryValue | null): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalInt(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) ? parsed : null;
}

const schema = z.object({
  couponId: z.string().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().int().min(1),
  maxUsesPerUser: z.coerce.number().int().min(1).max(100),
  descriptionFa: z.string().trim().max(150).optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(150).optional().or(z.literal("")),
});

export async function saveCouponAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/${locale}/admin/coupons?error=invalid`);

  // A percentage above 100 would produce a negative order total.
  if (parsed.data.type === "PERCENT" && parsed.data.value > 100) {
    redirect(`/${locale}/admin/coupons?error=percent`);
  }

  const { couponId, ...rest } = parsed.data;
  const data = {
    ...rest,
    descriptionFa: rest.descriptionFa ?? "",
    descriptionEn: rest.descriptionEn ?? "",
    minOrder: optionalInt(formData.get("minOrder")),
    maxDiscount: optionalInt(formData.get("maxDiscount")),
    maxUses: optionalInt(formData.get("maxUses")),
    startsAt: optionalDate(formData.get("startsAt")),
    expiresAt: optionalDate(formData.get("expiresAt")),
    firstOrderOnly: formData.get("firstOrderOnly") === "on",
    active: formData.get("active") === "on",
  };

  if (couponId) {
    await prisma.coupon.update({ where: { id: couponId }, data });
  } else {
    const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
    if (existing) redirect(`/${locale}/admin/coupons?error=code`);
    await prisma.coupon.create({ data });
  }

  revalidatePath(`/${locale}/admin/coupons`);
  redirect(`/${locale}/admin/coupons?saved=1`);
}

export async function toggleCouponAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);
  const couponId = String(formData.get("couponId") ?? "");

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) redirect(`/${locale}/admin/coupons`);

  await prisma.coupon.update({ where: { id: coupon.id }, data: { active: !coupon.active } });
  revalidatePath(`/${locale}/admin/coupons`);
  redirect(`/${locale}/admin/coupons?saved=1`);
}
