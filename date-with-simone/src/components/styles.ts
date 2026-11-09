/** Classi condivise. Regola dei raggi: pulsanti principali a pillola, tutto il resto 16px. */

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-[15px] font-medium text-accent-ink shadow-[0_12px_28px_-14px_var(--accent)] transition duration-200 hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-raised px-6 text-[15px] font-medium text-ink transition duration-200 hover:border-ink-soft/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const btnQuiet =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:text-ink active:scale-[0.98]";

export const field =
  "block w-full rounded-2xl border border-line bg-raised px-4 py-3.5 text-[16px] text-ink outline-none transition duration-200 placeholder:text-ink-soft/80 focus:border-accent focus:ring-4 focus:ring-accent/15";

export const label = "block text-[15px] font-medium text-ink";

export const help = "text-[13px] leading-snug text-ink-soft";
