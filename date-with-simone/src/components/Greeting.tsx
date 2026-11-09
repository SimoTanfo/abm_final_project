import { config } from "@/config";

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;
const delay = (ms: number): CSSVars => ({ "--d": `${ms}ms` });

export function Greeting({ name, note }: { name: string; note: string | null }) {
  // L'emoji resta attaccata all'ultima parola del nome, così non va a capo da sola
  const words = name.split(" ");
  const last = words.pop();
  const lead = words.length ? `${words.join(" ")} ` : "";
  return (
    <header>
      <h1 className="rise break-words font-display text-[3.35rem] font-medium leading-[1.04] tracking-[-0.01em] sm:text-7xl">
        Ciao {lead}
        <span className="whitespace-nowrap">
          {last}{" "}
          <span className="wave" aria-hidden="true">
            👋
          </span>
        </span>
      </h1>
      <p
        className="rise mt-5 pb-1 font-display text-[1.75rem] italic leading-[1.2] sm:text-[2.4rem]"
        style={delay(140)}
      >
        {config.hostName} ti sta invitando a un appuntamento.
      </p>
      <p className="rise mt-4 text-[17px] leading-relaxed text-ink-soft" style={delay(260)}>
        Scegli tu quando, al resto penso io.
      </p>
      {note && (
        <figure className="rise mt-9 max-w-[34ch] border-l-2 border-accent pl-5" style={delay(380)}>
          <blockquote className="whitespace-pre-line font-display text-[1.35rem] italic leading-snug">
            &ldquo;{note}&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-sm text-ink-soft">{config.hostName}</figcaption>
        </figure>
      )}
    </header>
  );
}
