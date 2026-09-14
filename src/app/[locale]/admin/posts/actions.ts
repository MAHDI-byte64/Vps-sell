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

const schema = z.object({
  postId: z.string().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  titleFa: z.string().trim().min(1).max(150),
  titleEn: z.string().trim().min(1).max(150),
  excerptFa: z.string().trim().max(300).optional().or(z.literal("")),
  excerptEn: z.string().trim().max(300).optional().or(z.literal("")),
  bodyFa: z.string().max(60_000).optional().or(z.literal("")),
  bodyEn: z.string().max(60_000).optional().or(z.literal("")),
  coverEmoji: z.string().trim().max(8),
  tags: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function savePostAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/${locale}/admin/posts?error=invalid`);

  const { postId, tags, ...rest } = parsed.data;
  const published = formData.get("published") === "on";

  const data = {
    ...rest,
    excerptFa: rest.excerptFa ?? "",
    excerptEn: rest.excerptEn ?? "",
    bodyFa: rest.bodyFa ?? "",
    bodyEn: rest.bodyEn ?? "",
    coverEmoji: rest.coverEmoji || "📘",
    tags: (tags ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8),
    published,
    authorId: admin.id,
  };

  if (postId) {
    const existing = await prisma.post.findUnique({ where: { id: postId } });
    await prisma.post.update({
      where: { id: postId },
      data: {
        ...data,
        // The first publish stamps the date; later edits keep the original.
        publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
      },
    });
  } else {
    const clash = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
    if (clash) redirect(`/${locale}/admin/posts?error=slug`);
    await prisma.post.create({
      data: { ...data, publishedAt: published ? new Date() : null },
    });
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/posts?saved=1`);
}

export async function deletePostAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);
  const postId = String(formData.get("postId") ?? "");

  await prisma.post.delete({ where: { id: postId } }).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/posts?saved=1`);
}
