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

const planSchema = z.object({
  planId: z.string().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits and dashes"),
  type: z.enum(["VPS_LINUX", "VPS_WINDOWS", "DEDICATED"]),
  nameFa: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  descFa: z.string().trim().max(300).optional().or(z.literal("")),
  descEn: z.string().trim().max(300).optional().or(z.literal("")),
  cpuCores: z.coerce.number().int().min(1).max(256),
  cpuNoteFa: z.string().trim().max(60).optional().or(z.literal("")),
  cpuNoteEn: z.string().trim().max(60).optional().or(z.literal("")),
  ramMb: z.coerce.number().int().min(128).max(4_194_304),
  diskGb: z.coerce.number().int().min(5).max(100_000),
  diskType: z.string().trim().max(20),
  bandwidthGb: z.coerce.number().int().min(0).max(1_000_000),
  portMbps: z.coerce.number().int().min(10).max(100_000),
  ipv4Count: z.coerce.number().int().min(0).max(32),
  priceMonthly: z.coerce.number().int().min(1000).max(2_000_000_000),
  setupFee: z.coerce.number().int().min(0).max(2_000_000_000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  stock: z.string().optional().or(z.literal("")),
});

export async function savePlanAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);

  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/${locale}/admin/plans?error=invalid`);

  const { planId, stock, ...rest } = parsed.data;
  const locationIds = formData.getAll("locationIds").map(String).filter(Boolean);

  const data = {
    ...rest,
    descFa: rest.descFa ?? "",
    descEn: rest.descEn ?? "",
    cpuNoteFa: rest.cpuNoteFa ?? "",
    cpuNoteEn: rest.cpuNoteEn ?? "",
    // An empty stock box means "unlimited", which the schema stores as null.
    stock: stock === "" || stock === undefined ? null : Number(stock),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    locations: { set: locationIds.map((id) => ({ id })) },
  };

  if (planId) {
    await prisma.plan.update({ where: { id: planId }, data });
  } else {
    const existing = await prisma.plan.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) redirect(`/${locale}/admin/plans?error=slug`);
    await prisma.plan.create({
      data: { ...data, locations: { connect: locationIds.map((id) => ({ id })) } },
    });
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/plans?saved=1`);
}

export async function togglePlanActiveAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);
  const planId = String(formData.get("planId") ?? "");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) redirect(`/${locale}/admin/plans`);

  await prisma.plan.update({ where: { id: plan.id }, data: { active: !plan.active } });
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/plans?saved=1`);
}
