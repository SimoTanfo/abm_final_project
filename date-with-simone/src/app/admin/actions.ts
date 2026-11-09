"use server";

import { redirect } from "next/navigation";
import { config } from "@/config";
import { getInviteSecret } from "@/lib/env";
import { dayLabel } from "@/lib/format";
import { checkPassword, endAdminSession, isAdmin, startAdminSession } from "@/lib/session";
import { NAME_MAX, NOTE_MAX, createInvite, signInvite } from "@/lib/token";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  let ok: boolean;
  try {
    ok = checkPassword(password);
  } catch {
    return { error: "Configurazione incompleta: imposta ADMIN_PASSWORD e INVITE_SECRET su Vercel." };
  }
  if (!ok) {
    // Rallenta i tentativi a forza bruta
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { error: "Password sbagliata." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin");
}

export type CreateInviteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "ok"; token: string; name: string; expiresLabel: string; nonce: number };

export async function createInviteAction(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  if (!(await isAdmin())) return { status: "error", error: "Sessione scaduta. Ricarica la pagina ed entra di nuovo." };

  const name = String(formData.get("name") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!name.trim()) return { status: "error", error: "Scrivi il suo nome." };
  if (name.trim().length > NAME_MAX) return { status: "error", error: `Il nome può avere al massimo ${NAME_MAX} caratteri.` };
  if (note.trim().length > NOTE_MAX) return { status: "error", error: `La nota può avere al massimo ${NOTE_MAX} caratteri.` };

  const invite = createInvite({ name, note }, config.inviteValidityDays);
  return {
    status: "ok",
    token: signInvite(invite, getInviteSecret()),
    name: invite.name,
    expiresLabel: dayLabel(invite.expiresAt),
    nonce: Date.now(),
  };
}
