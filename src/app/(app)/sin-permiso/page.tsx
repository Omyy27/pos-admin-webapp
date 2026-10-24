import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Sin permiso" };

export default function SinPermisoPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-[26px] border border-line bg-surface p-8 text-center shadow-[0_24px_80px_-48px_rgba(23,52,43,0.5)]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-soft text-[#8a5a16]">
          <ShieldAlert className="size-6" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
          Acceso restringido
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-ink">
          Esta sección no está en tu rol
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Si necesitas verla o modificarla, pide a un administrador que ajuste
          tus permisos.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
