import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { env } from "./env";
import type { Locale } from "@/i18n/config";

export const SESSION_COOKIE = "vpssell_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // two weeks

const secretKey = new TextEncoder().encode(env.authSecret);

export type SessionPayload = { userId: string; role: "USER" | "ADMIN" };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId !== "string") return null;
    const role = payload.role === "ADMIN" ? "ADMIN" : "USER";
    return { userId: payload.userId, role };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "USER" | "ADMIN";
  walletBalance: number;
  active: boolean;
};

/**
 * Resolves the signed-in user from the session cookie. The token is only a
 * pointer — role and status are re-read from the database on every call so a
 * demoted or deactivated account loses access immediately rather than when
 * their cookie happens to expire.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await readSessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      walletBalance: true,
      active: true,
    },
  });

  if (!user || !user.active) return null;
  return user;
}

export async function requireUser(locale: Locale, returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/${locale}/login${next}`);
  }
  return user;
}

export async function requireAdmin(locale: Locale): Promise<CurrentUser> {
  const user = await requireUser(locale, `/${locale}/admin`);
  if (user.role !== "ADMIN") redirect(`/${locale}/dashboard`);
  return user;
}
