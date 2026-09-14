"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export type AuthState = { error?: string };

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

/** Only same-origin, absolute-path redirects are honoured after sign-in. */
function safeNext(raw: FormDataEntryValue | null, locale: Locale): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return `/${locale}/dashboard`;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const dict = getDictionary(locale);

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: dict.auth.invalidCredentials };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Run the comparison even when the account is missing so the response time
  // does not reveal which emails are registered.
  const hash = user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await verifyPassword(parsed.data.password, hash);

  if (!user || !ok) return { error: dict.auth.invalidCredentials };
  if (!user.active) return { error: dict.auth.accountDisabled };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ userId: user.id, role: user.role });

  redirect(safeNext(formData.get("next"), locale));
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    password: z.string().min(8).max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"] });

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const dict = getDictionary(locale);

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    // Surface the most useful single message rather than a field map.
    const issues = parsed.error.issues;
    if (issues.some((issue) => issue.path[0] === "confirmPassword")) {
      return { error: dict.auth.passwordMismatch };
    }
    if (issues.some((issue) => issue.path[0] === "password")) {
      return { error: dict.auth.passwordTooShort };
    }
    if (issues.some((issue) => issue.path[0] === "email")) {
      return { error: dict.auth.invalidEmail };
    }
    return { error: dict.auth.nameRequired };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: dict.auth.emailTaken };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      lastLoginAt: new Date(),
    },
  });

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNext(formData.get("next"), locale));
}
