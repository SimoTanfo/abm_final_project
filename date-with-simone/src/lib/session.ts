import "server-only";
import { createHash, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminPassword, getInviteSecret } from "./env";
import { deriveKey, safeEqual } from "./token";

/**
 * Sessione admin senza database: cookie `<scadenza>.<firma>`.
 * La chiave dipende sia da INVITE_SECRET sia da ADMIN_PASSWORD,
 * quindi cambiare la password invalida subito tutte le sessioni aperte.
 */

const COOKIE_NAME = "dws_admin";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sessionKey(): Buffer {
  return deriveKey(getInviteSecret(), `admin:${sha256(getAdminPassword()).toString("hex")}`);
}

function sign(exp: number): string {
  return createHmac("sha256", sessionKey()).update(`admin:${exp}`).digest("base64url");
}

export function checkPassword(input: string): boolean {
  return safeEqual(sha256(input), sha256(getAdminPassword()));
}

export function verifySessionValue(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const [expRaw, sig] = value.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig || exp * 1000 <= now) return false;
  return safeEqual(Buffer.from(sign(exp)), Buffer.from(sig));
}

export async function isAdmin(): Promise<boolean> {
  try {
    const value = (await cookies()).get(COOKIE_NAME)?.value;
    return verifySessionValue(value);
  } catch {
    return false;
  }
}

export async function startAdminSession(): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  (await cookies()).set(COOKIE_NAME, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
