import "server-only";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ConfigError(`Variabile d'ambiente mancante: ${name}`);
  return value;
}

export function getInviteSecret(): string {
  const secret = required("INVITE_SECRET");
  if (secret.length < 32) {
    throw new ConfigError("INVITE_SECRET deve essere lungo almeno 32 caratteri");
  }
  return secret;
}

export function getAdminPassword(): string {
  return required("ADMIN_PASSWORD");
}

/**
 * Normalizza la chiave privata del service account.
 * Accetta la chiave così com'è nel JSON (con \n escapati), con a capo veri,
 * o racchiusa tra virgolette.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

export function getGoogleCredentials() {
  return {
    email: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: normalizePrivateKey(required("GOOGLE_PRIVATE_KEY")),
    calendarId: required("GOOGLE_CALENDAR_ID"),
  };
}

/**
 * Modalità demo con calendario finto in memoria, utile per provare l'app in locale
 * senza Google. Non si attiva mai sul deploy di produzione di Vercel.
 */
export function isMockCalendar(): boolean {
  return process.env.CALENDAR_MOCK === "1" && process.env.VERCEL_ENV !== "production";
}

export function envStatus() {
  const has = (name: string) => Boolean(process.env[name]?.trim());
  return {
    INVITE_SECRET: has("INVITE_SECRET") && (process.env.INVITE_SECRET?.trim().length ?? 0) >= 32,
    ADMIN_PASSWORD: has("ADMIN_PASSWORD"),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: has("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    GOOGLE_PRIVATE_KEY: has("GOOGLE_PRIVATE_KEY"),
    GOOGLE_CALENDAR_ID: has("GOOGLE_CALENDAR_ID"),
  };
}
