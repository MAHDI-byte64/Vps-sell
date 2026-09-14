"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function updateProfileAction(formData: FormData) {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/profile?error=invalid`);

  // The email is deliberately not editable here: it is the login identifier
  // and changing it needs an ownership check we do not have yet.
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/dashboard/profile?saved=1`);
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"] });

export async function updatePasswordAction(formData: FormData) {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) redirect(`/${locale}/dashboard/profile?error=password`);

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) redirect(`/${locale}/login`);

  const ok = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!ok) redirect(`/${locale}/dashboard/profile?error=current`);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  redirect(`/${locale}/dashboard/profile?password=1`);
}
