import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckCircle, SignOut, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Frame } from "@/components/Frame";
import { InviteGenerator } from "@/components/admin/InviteGenerator";
import { LoginForm } from "@/components/admin/LoginForm";
import { btnQuiet } from "@/components/styles";
import { config } from "@/config";
import { getCalendar, type Booking } from "@/lib/calendar";
import { envStatus, isMockCalendar } from "@/lib/env";
import { dayLabel, timeLabel } from "@/lib/format";
import { isAdmin } from "@/lib/session";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Date with Simone" };

type CalendarState =
  | { ok: true; upcoming: Booking[] }
  | { ok: false; error: string };

async function loadCalendar(): Promise<CalendarState> {
  try {
    const calendar = getCalendar();
    const now = Date.now();
    // freebusy verifica anche che il calendario sia condiviso con il service account
    await calendar.busy({ start: now, end: now + 60 * 60 * 1000 });
    return { ok: true, upcoming: await calendar.upcomingBookings(now) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function AdminPage() {
  // Sempre per richiesta: le variabili d'ambiente e il cookie vanno letti a runtime
  await connection();
  const env = envStatus();
  const coreReady = env.INVITE_SECRET && env.ADMIN_PASSWORD;

  if (!coreReady) {
    return (
      <Frame>
        <h1 className="rise font-display text-5xl font-medium">Quasi pronto.</h1>
        <p className="rise mt-4 max-w-[48ch] text-[17px] leading-relaxed text-ink-soft">
          Per entrare servono <code className="font-mono text-[15px]">ADMIN_PASSWORD</code> e{" "}
          <code className="font-mono text-[15px]">INVITE_SECRET</code> (almeno 32 caratteri). Aggiungile su
          Vercel e rifai il deploy: i passi sono in SETUP.md.
        </p>
        <EnvList env={env} />
      </Frame>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Frame>
        <h1 className="rise font-display text-[3.2rem] font-medium leading-none sm:text-6xl">Ciao {config.hostName}</h1>
        <p className="rise mt-4 text-[17px] text-ink-soft" style={{ "--d": "60ms" } as React.CSSProperties}>
          Entra per creare un nuovo invito.
        </p>
        <LoginForm />
      </Frame>
    );
  }

  const calendar = await loadCalendar();

  return (
    <Frame>
      <div className="flex items-start justify-between gap-4">
        <h1 className="rise font-display text-[3.2rem] font-medium leading-none sm:text-6xl">Nuovo invito</h1>
        <form action={logoutAction}>
          <button type="submit" className={btnQuiet}>
            <SignOut size={16} aria-hidden="true" />
            Esci
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-16">
        <section className="rise" style={{ "--d": "80ms" } as React.CSSProperties}>
          <InviteGenerator />
        </section>

        <aside className="rise space-y-12" style={{ "--d": "160ms" } as React.CSSProperties}>
          <section>
            <h2 className="font-display text-[1.75rem] font-medium">Prossimi appuntamenti</h2>
            {!calendar.ok ? (
              <p className="mt-3 text-[15px] text-ink-soft">Non disponibili finché il calendario non è collegato.</p>
            ) : calendar.upcoming.length === 0 ? (
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Ancora nessuno. Quando lei sceglie, l&apos;appuntamento compare qui e sul tuo Google Calendar.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {calendar.upcoming.map((b) => (
                  <li key={b.eventId} className="rounded-2xl border border-line bg-raised px-4 py-3">
                    <p className="font-display text-xl font-medium">{b.guestName}</p>
                    <p className="text-[14px] text-ink-soft">
                      {dayLabel(b.start)}, {timeLabel(b.start)}
                    </p>
                    {b.contact && <p className="mt-1 break-words text-[14px]">{b.contact}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-[1.75rem] font-medium">Collegamento</h2>
            {calendar.ok ? (
              <p className="mt-3 flex items-start gap-2 text-[15px]">
                <CheckCircle size={20} weight="fill" className="mt-px shrink-0 text-accent" aria-hidden="true" />
                {isMockCalendar() ? "Calendario demo in memoria attivo." : "Google Calendar risponde correttamente."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="flex items-start gap-2 text-[15px] text-danger">
                  <WarningCircle size={20} weight="fill" className="mt-px shrink-0" aria-hidden="true" />
                  Google Calendar non raggiungibile.
                </p>
                <p className="break-words rounded-2xl border border-line bg-raised px-4 py-3 font-mono text-[12px] leading-relaxed text-ink-soft">
                  {calendar.error}
                </p>
              </div>
            )}
            <EnvList env={env} />
          </section>
        </aside>
      </div>
    </Frame>
  );
}

function EnvList({ env }: { env: ReturnType<typeof envStatus> }) {
  return (
    <ul className="mt-5 space-y-1.5">
      {Object.entries(env).map(([name, ok]) => (
        <li key={name} className="flex items-center gap-2 font-mono text-[12px] text-ink-soft">
          {ok ? (
            <CheckCircle size={14} weight="fill" className="text-accent" aria-label="impostata" />
          ) : (
            <WarningCircle size={14} weight="fill" className="text-danger" aria-label="mancante" />
          )}
          {name}
        </li>
      ))}
    </ul>
  );
}
