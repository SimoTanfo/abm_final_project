import { btnSecondary } from "./styles";

/** Schermata per invito non valido, scaduto o calendario non raggiungibile */
export function StatusMessage({
  title,
  body,
  retry,
}: {
  title: string;
  body: string;
  retry?: string;
}) {
  return (
    <section className="max-w-xl pt-6 md:pt-12">
      <h1 className="rise font-display text-[2.7rem] font-medium leading-[1.06] sm:text-6xl">{title}</h1>
      <p className="rise mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft" style={{ "--d": "120ms" } as React.CSSProperties}>
        {body}
      </p>
      {retry && (
        <a href={retry} className={`rise mt-8 ${btnSecondary}`} style={{ "--d": "220ms" } as React.CSSProperties}>
          Riprova
        </a>
      )}
    </section>
  );
}
