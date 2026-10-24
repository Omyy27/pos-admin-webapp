"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-grain flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-[26px] border border-line bg-surface p-8 shadow-[0_24px_80px_-48px_rgba(23,52,43,0.5)]">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <AlertCircle className="size-6" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-danger">
          Algo no salió bien
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-ink">
          No pudimos cargar esta sección
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Intenta de nuevo. Si el problema continúa, revisa la configuración de
          Supabase o consulta la consola del servidor.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
