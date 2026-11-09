import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NAME_MAX, NOTE_MAX } from "./limits";

export { NAME_MAX, NOTE_MAX };

/**
 * Token di invito: `<payload base64url>.<firma HMAC-SHA256 base64url>`.
 * Il payload è leggibile da chiunque abbia il link (è solo firmato, non cifrato):
 * per questo la nota è pensata come messaggio per lei, non come appunto privato.
 */

export type Invite = {
  id: string;
  name: string;
  note: string | null;
  /** Creazione, millisecondi epoch */
  createdAt: number;
  /** Scadenza, millisecondi epoch */
  expiresAt: number;
};

type CompactPayload = {
  v: 1;
  i: string;
  n: string;
  m?: string;
  c: number;
  e: number;
};

export function deriveKey(secret: string, purpose: string): Buffer {
  return createHmac("sha256", secret).update(`date-with-simone:${purpose}`).digest();
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cleanText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

export function newInviteId(): string {
  return randomBytes(12).toString("hex");
}

export function createInvite(
  input: { name: string; note?: string | null },
  validityDays: number,
  now = Date.now(),
): Invite {
  const name = cleanText(input.name.replace(/\s+/g, " "), NAME_MAX);
  if (!name) throw new Error("Il nome è obbligatorio");
  const note = input.note ? cleanText(input.note, NOTE_MAX) || null : null;
  const createdAt = Math.floor(now / 1000) * 1000;
  return {
    id: newInviteId(),
    name,
    note,
    createdAt,
    expiresAt: createdAt + validityDays * 24 * 60 * 60 * 1000,
  };
}

export function signInvite(invite: Invite, secret: string): string {
  const payload: CompactPayload = {
    v: 1,
    i: invite.id,
    n: invite.name,
    ...(invite.note ? { m: invite.note } : {}),
    c: Math.floor(invite.createdAt / 1000),
    e: Math.floor(invite.expiresAt / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = hmac(deriveKey(secret, "invite"), body).toString("base64url");
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; invite: Invite; expired: boolean }
  | { ok: false; reason: "malformed" | "bad_signature" };

export function verifyInvite(token: string, secret: string, now = Date.now()): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1] || token.length > 4096) {
    return { ok: false, reason: "malformed" };
  }
  const [body, sig] = parts;
  const expected = hmac(deriveKey(secret, "invite"), body);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!safeEqual(expected, given)) return { ok: false, reason: "bad_signature" };

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const p = data as Partial<CompactPayload>;
  if (
    p?.v !== 1 ||
    typeof p.i !== "string" ||
    !/^[a-f0-9]{24}$/.test(p.i) ||
    typeof p.n !== "string" ||
    typeof p.c !== "number" ||
    typeof p.e !== "number" ||
    (p.m !== undefined && typeof p.m !== "string")
  ) {
    return { ok: false, reason: "malformed" };
  }
  const invite: Invite = {
    id: p.i,
    name: p.n,
    note: p.m ?? null,
    createdAt: p.c * 1000,
    expiresAt: p.e * 1000,
  };
  return { ok: true, invite, expired: now >= invite.expiresAt };
}
