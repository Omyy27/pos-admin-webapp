import type { Metadata } from "next";
import {
  Banknote,
  CalendarClock,
  Globe2,
  ReceiptText,
  Store,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { formatDateTime } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui/card";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const metadata: Metadata = {
  title: "Configuración",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await requirePermission("settings.manage");
  const settings = auth.settings;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administración"
        title="Configuración"
        description="Datos del negocio, alertas de caducidad y mensaje del ticket. La moneda y la zona horaria están fijadas para toda la operación."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.7fr)]">
        <SettingsForm settings={settings} />

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Store className="size-4" />
              </span>
              <h2 className="font-display text-lg font-semibold text-ink">
                Operación
              </h2>
            </div>

            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Banknote className="size-3.5" />
                  Moneda
                </dt>
                <dd className="font-bold text-ink">COP · Peso colombiano</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Globe2 className="size-3.5" />
                  Zona horaria
                </dt>
                <dd className="text-right font-bold text-ink">
                  {settings.timezone}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <ReceiptText className="size-3.5" />
                  Impuestos
                </dt>
                <dd className="text-right font-bold text-ink">
                  {settings.prices_include_tax
                    ? "Incluidos en el precio"
                    : "No incluidos"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <CalendarClock className="size-3.5" />
                  Alerta de vencimiento
                </dt>
                <dd className="text-right font-bold text-ink">
                  {settings.expiry_alert_days} días
                </dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
              Última actualización:{" "}
              {formatDateTime(settings.updated_at, settings.timezone)}
            </p>
          </Card>

          <Card className="bg-brand-deep p-5 text-white">
            <h2 className="font-display text-lg font-semibold">
              Cómo funcionan los precios
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              Todos los precios se guardan como precio final de venta en COP,
              con el impuesto incluido. El POS nunca recalcula impuestos ni
              acepta precios enviados desde el navegador: la base de datos lee
              el precio vigente del producto al registrar la venta.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold text-ink">
              Roles del sistema
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>
                <strong className="text-ink">Administrador:</strong> acceso
                completo, usuarios, costos y anulaciones.
              </li>
              <li>
                <strong className="text-ink">Vendedor:</strong> punto de venta y
                consulta de sus propios tickets.
              </li>
              <li>
                <strong className="text-ink">Inventario:</strong> catálogo,
                lotes, ajustes, bajas y alertas de vencimiento.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
