/** Scheletro mostrato mentre il server legge il calendario */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-[max(2.75rem,env(safe-area-inset-top))] sm:px-8 md:pt-20" aria-busy="true">
      <span className="sr-only">Sto guardando il calendario...</span>
      <div className="animate-pulse md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-14 lg:gap-24">
        <div>
          <div className="h-14 w-3/4 rounded-2xl bg-line/70" />
          <div className="mt-6 h-8 w-full rounded-2xl bg-line/50" />
          <div className="mt-3 h-8 w-2/3 rounded-2xl bg-line/50" />
          <div className="mt-6 h-5 w-1/2 rounded-2xl bg-line/40" />
        </div>
        <div className="mt-14 md:mt-2">
          <div className="h-9 w-1/2 rounded-2xl bg-line/60" />
          <div className="mt-6 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[5.1rem] w-[4.6rem] shrink-0 rounded-2xl bg-line/50" />
            ))}
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 rounded-2xl bg-line/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
