"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { bookAction } from "@/app/i/[token]/actions";
import type { DayGroup } from "@/lib/format";
import type { PresentedBooking } from "@/lib/present";
import { BookingCard } from "./BookingCard";
import { btnPrimary, field, help, label } from "./styles";

type Props = {
  token: string;
  guestName: string;
  hostName: string;
  durationLabel: string;
  days: DayGroup[];
  greeting: React.ReactNode;
};

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BookingFlow({ token, guestName, hostName, durationLabel, days, greeting }: Props) {
  const router = useRouter();
  const [dayKey, setDayKey] = useState<string | null>(days[0]?.key ?? null);
  const [start, setStart] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ booking: PresentedBooking; fresh: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Se la lista si aggiorna (slot appena preso), la selezione resta coerente
  const day = days.find((d) => d.key === dayKey) ?? days[0] ?? null;
  const slot = day?.slots.find((s) => s.start === start) ?? null;

  useEffect(() => {
    if (!start) return;
    formRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [start]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!slot || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await bookAction(token, slot.start, contact, message);
        if (res.status === "booked" || res.status === "already_booked") {
          setResult({ booking: res.booking, fresh: res.status === "booked" });
          window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        } else if (res.status === "slot_unavailable") {
          setStart(null);
          setError("Questo orario non è più libero. Ho aggiornato la lista, scegline un altro.");
          router.refresh();
        } else if (res.status === "expired") {
          setError(`Questo invito è scaduto. Scrivi a ${hostName} per averne uno nuovo.`);
        } else {
          setError(res.message);
        }
      } catch {
        setError("La connessione sembra assente. Riprova tra poco.");
      }
    });
  }

  if (result) {
    return (
      <BookingCard
        token={token}
        guestName={guestName}
        booking={result.booking}
        variant={result.fresh ? "new" : "existing"}
      />
    );
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-14 lg:gap-24">
      <div className="md:sticky md:top-20 md:self-start">{greeting}</div>

      <section aria-labelledby="quando" className="rise mt-14 md:mt-2" style={delay(420)}>
        <h2 id="quando" className="font-display text-[2rem] font-medium leading-tight">
          Quando ti va?
        </h2>
        <p className={`${help} mt-1`}>{durationLabel}</p>

        {error && (
          <p
            role="alert"
            className="fade mt-5 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] leading-snug text-danger"
          >
            <Warning size={18} className="mt-px shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {days.length === 0 || !day ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line px-5 py-8">
            <p className="font-display text-2xl italic">Settimane piene, per ora.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Nei prossimi giorni {hostName} non ha orari liberi. Scrivigli pure, troverete un momento.
            </p>
          </div>
        ) : (
          <>
            <div
              role="radiogroup"
              aria-label="Giorno"
              className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0"
            >
              {days.map((d) => {
                const selected = d.key === day.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={d.label}
                    onClick={() => {
                      setDayKey(d.key);
                      setStart(null);
                      setError(null);
                    }}
                    className={`flex w-[4.6rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 pb-2.5 pt-2 transition duration-200 active:scale-[0.97] md:w-auto ${
                      selected
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-raised text-ink hover:border-ink-soft/60"
                    }`}
                  >
                    <span className={`text-[12px] ${selected ? "text-paper/75" : "text-ink-soft"}`}>
                      {d.weekdayShort}
                    </span>
                    <span className="font-display text-[1.9rem] font-medium leading-none lining-nums tabular-nums">
                      {d.dayNumber}
                    </span>
                    <span className={`mt-0.5 text-[12px] ${selected ? "text-paper/75" : "text-ink-soft"}`}>
                      {d.monthShort}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7" key={day.key}>
              <p className="fade text-[15px] font-medium">{day.label}</p>
              <div role="radiogroup" aria-label="Orario" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
                {day.slots.map((s, i) => {
                  const selected = s.start === slot?.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setStart(s.start);
                        setError(null);
                      }}
                      style={delay(Math.min(i, 10) * 25)}
                      className={`fade min-h-12 rounded-2xl border text-[16px] tabular-nums transition duration-200 active:scale-[0.97] ${
                        selected
                          ? "border-accent bg-accent font-medium text-accent-ink"
                          : "border-line bg-raised text-ink hover:border-accent/60"
                      }`}
                    >
                      {s.time}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {slot && day && (
          <form
            ref={formRef}
            onSubmit={submit}
            className="pop mt-10 scroll-mt-6 rounded-2xl border border-line bg-raised p-5 shadow-[0_30px_60px_-45px_rgb(120_40_60/0.5)] sm:p-6"
          >
            <p className="text-[13px] text-ink-soft">Hai scelto</p>
            <p className="mt-0.5 font-display text-[1.7rem] font-medium leading-tight">
              {day.label}, <span className="italic text-accent">{slot.time}</span>
            </p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="contact" className={label}>
                  Dove ti scrivo?
                </label>
                <input
                  id="contact"
                  name="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={80}
                  autoComplete="tel"
                  placeholder="Numero o @instagram"
                  className={field}
                  aria-describedby="contact-help"
                />
                <p id="contact-help" className={help}>
                  Facoltativo. Lo vede solo {hostName}.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className={label}>
                  Vuoi dirmi qualcosa?
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Un'idea, una preferenza, un saluto"
                  className={`${field} resize-none`}
                  aria-describedby="message-help"
                />
                <p id="message-help" className={help}>
                  Facoltativo.
                </p>
              </div>
            </div>

            <button type="submit" disabled={pending} className={`${btnPrimary} mt-7 w-full`}>
              {pending ? (
                "Un attimo..."
              ) : (
                <>
                  Conferma l&apos;appuntamento
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
