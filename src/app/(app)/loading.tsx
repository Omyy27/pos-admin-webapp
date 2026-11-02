export default function AppLoading() {
  return (
    <div
      className="animate-pulse space-y-5"
      role="status"
      aria-live="polite"
      aria-label="Cargando contenido"
    >
      <span className="sr-only">Cargando contenido…</span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <div className="h-3 w-28 rounded-full bg-line/80" />
          <div className="h-8 w-56 rounded-lg bg-line/70" />
          <div className="h-3 w-40 rounded-full bg-line/60" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-line/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-line/80 bg-surface p-5"
          >
            <div className="h-3 w-20 rounded-full bg-line/70" />
            <div className="mt-4 h-7 w-24 rounded-lg bg-line/80" />
            <div className="mt-3 h-3 w-32 rounded-full bg-line/50" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-line/80 bg-surface p-5">
          <div className="h-4 w-36 rounded-full bg-line/70" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 rounded-xl bg-canvas/80" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-surface p-5">
          <div className="h-4 w-28 rounded-full bg-line/70" />
          <div className="mt-5 h-40 rounded-xl bg-canvas/80" />
        </div>
      </div>
    </div>
  );
}
