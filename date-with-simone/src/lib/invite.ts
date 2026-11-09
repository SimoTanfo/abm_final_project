import "server-only";
import { getInviteSecret } from "./env";
import { verifyInvite, type Invite } from "./token";

export type ReadInviteResult =
  | { kind: "ok"; invite: Invite; expired: boolean }
  | { kind: "invalid" }
  | { kind: "config_error" };

export function readInvite(rawToken: string): ReadInviteResult {
  let secret: string;
  try {
    secret = getInviteSecret();
  } catch {
    return { kind: "config_error" };
  }
  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    return { kind: "invalid" };
  }
  const result = verifyInvite(token, secret);
  if (!result.ok) return { kind: "invalid" };
  return { kind: "ok", invite: result.invite, expired: result.expired };
}
