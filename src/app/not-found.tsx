import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

export default function NotFound() {
  return (
    <main className="bg-grain flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[26px] border border-line bg-surface p-8 text-center shadow-[0_24px_80px_-48px_rgba(23,52,43,0.5)]">
        <div className="mx-auto mb-5 flex justify-center">
          <BrandMark className="size-12" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
          Página no encontrada
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-ink">
          Este estante está vacío
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          La página que buscas no existe o ya no está disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Volver al resumen
        </Link>
      </div>
    </main>
  );
}
