import { isMockCalendar } from "@/lib/env";

/** Contenitore di pagina: margini sicuri per iPhone e firma in fondo */
export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2.75rem,env(safe-area-inset-top))] sm:px-8 md:pt-20">
      <main className="flex-1">{children}</main>
      <footer className="mt-20 flex items-center justify-between gap-4 text-ink-soft">
        <span className="font-display text-lg italic">Date with Simone</span>
        {isMockCalendar() && (
          <span className="rounded-2xl border border-line px-3 py-1 text-xs">Modalità demo</span>
        )}
      </footer>
    </div>
  );
}
