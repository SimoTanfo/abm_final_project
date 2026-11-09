import { describe, expect, it } from "vitest";
import { createInvite, signInvite, verifyInvite } from "@/lib/token";

const SECRET = "a".repeat(40);
const NOW = Date.UTC(2026, 10, 9, 12, 0, 0);

describe("token di invito", () => {
  const invite = createInvite({ name: "  Alessandra  ", note: "Conosco un posto, ti piacerà" }, 14, NOW);
  const token = signInvite(invite, SECRET);

  it("firma e verifica andata e ritorno", () => {
    const res = verifyInvite(token, SECRET, NOW + 1000);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.expired).toBe(false);
    expect(res.invite).toEqual(invite);
    expect(res.invite.name).toBe("Alessandra");
    expect(res.invite.id).toMatch(/^[a-f0-9]{24}$/);
    expect(res.invite.expiresAt - res.invite.createdAt).toBe(14 * 24 * 3600 * 1000);
  });

  it("segnala la scadenza dopo 14 giorni", () => {
    const res = verifyInvite(token, SECRET, invite.expiresAt + 1);
    expect(res.ok && res.expired).toBe(true);
  });

  it("rifiuta un payload modificato", () => {
    const [body, sig] = token.split(".");
    const tampered = JSON.parse(Buffer.from(body, "base64url").toString());
    tampered.n = "Giulia";
    tampered.e += 999_999;
    const forged = `${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${sig}`;
    expect(verifyInvite(forged, SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rifiuta un segreto diverso e i token malformati", () => {
    expect(verifyInvite(token, "b".repeat(40), NOW).ok).toBe(false);
    expect(verifyInvite("", SECRET, NOW).ok).toBe(false);
    expect(verifyInvite("abc", SECRET, NOW).ok).toBe(false);
    expect(verifyInvite("a.b.c", SECRET, NOW).ok).toBe(false);
  });

  it("gestisce nomi con accenti e nessuna nota", () => {
    const other = createInvite({ name: "Bérénice", note: "   " }, 14, NOW);
    expect(other.note).toBeNull();
    const res = verifyInvite(signInvite(other, SECRET), SECRET, NOW);
    expect(res.ok && res.invite.name).toBe("Bérénice");
  });

  it("richiede un nome", () => {
    expect(() => createInvite({ name: "   " }, 14, NOW)).toThrow();
  });
});
