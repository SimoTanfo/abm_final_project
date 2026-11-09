import { CalendarPlus, GoogleLogo, Heart } from "@phosphor-icons/react/dist/ssr";
import { config } from "@/config";
import type { PresentedBooking } from "@/lib/present";
import { btnPrimary, btnSecondary } from "./styles";

type Props = {
  token: string;
  guestName: string;
  booking: PresentedBooking;
  /** "new" subito dopo la conferma, "existing" quando riapre il link */
  variant: "new" | "existing";
};

export function BookingCard({ token, guestName, booking, variant }: Props) {
  const fresh = variant === "new";
  return (
    <section className="mx-auto max-w-2xl pt-4 text-center md:pt-10" aria-live="polite">
      <Heart weight="fill" className="pop mx-auto size-9 text-accent" aria-hidden="true" />
      <p className="rise mt-6 text-[17px] text-ink-soft">
        {fresh ? `Perfetto, ${guestName}.` : `Ciao ${guestName} 👋`}
      </p>
      <p className="rise mt-8 text-[15px] text-ink-soft" style={{ "--d": "80ms" } as React.CSSProperties}>
        {fresh ? "Ci vediamo" : "Hai già scelto:"}
      </p>
      <h1
        className="rise mt-1 font-display text-[2.9rem] font-medium leading-[1.05] sm:text-7xl"
        style={{ "--d": "140ms" } as React.CSSProperties}
      >
        {booking.dayLabel}
      </h1>
      <p
        className="rise pb-1 font-display text-[2rem] italic leading-tight text-accent sm:text-5xl"
        style={{ "--d": "200ms" } as React.CSSProperties}
      >
        alle {booking.timeLabel}
      </p>
      <p
        className="rise mx-auto mt-7 max-w-[34ch] text-balance text-[17px] leading-relaxed text-ink-soft"
        style={{ "--d": "280ms" } as React.CSSProperties}
      >
        {fresh ? "Al resto penso io. Ti scrivo presto con i dettagli." : "Ci vediamo lì!"}
      </p>
      <div
        className="rise mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        style={{ "--d": "360ms" } as React.CSSProperties}
      >
        <a href={`/i/${token}/calendar.ics`} className={btnPrimary}>
          <CalendarPlus size={20} aria-hidden="true" />
          Aggiungi al mio calendario
        </a>
        <a href={booking.googleUrl} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          <GoogleLogo size={18} aria-hidden="true" />
          Google Calendar
        </a>
      </div>
      <p className="fade mt-6 text-[13px] text-ink-soft" style={{ "--d": "600ms" } as React.CSSProperties}>
        Dalle {booking.timeLabel} alle {booking.endTimeLabel}, con {config.hostName}.
      </p>
    </section>
  );
}
