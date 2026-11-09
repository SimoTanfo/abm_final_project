import { Frame } from "@/components/Frame";
import { config } from "@/config";

export default function Home() {
  return (
    <Frame>
      <section className="max-w-xl pt-6 md:pt-12">
        <h1 className="rise font-display text-[3.4rem] font-medium leading-[1.02] sm:text-7xl">
          Date with <span className="italic text-accent">{config.hostName}</span>
        </h1>
        <p className="rise mt-6 max-w-[38ch] text-[17px] leading-relaxed text-ink-soft" style={{ "--d": "120ms" } as React.CSSProperties}>
          Qui si entra solo con un invito personale. Se ne hai ricevuto uno, aprilo dal messaggio in cui è arrivato.
        </p>
      </section>
    </Frame>
  );
}
