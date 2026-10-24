import Link from "next/link";
import { Boxes, Layers, TriangleAlert } from "lucide-react";
import {
  daysUntil,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatNumber,
} from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { LotActions } from "@/features/inventory/components/lot-actions";
import type { InventoryProduct } from "@/features/inventory/queries";
import type { ProductLotRow } from "@/types/database";

export function LotTable({
  visibleLots,
  hasAnyLots,
  productsById,
  canManage,
  expiryAlertDays,
  timeZone,
}: {
  visibleLots: ProductLotRow[];
  hasAnyLots: boolean;
  productsById: Map<string, InventoryProduct>;
  canManage: boolean;
  expiryAlertDays: number;
  timeZone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Layers className="size-5 text-brand" />
            Lotes
          </h2>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(visibleLots.length)} lote
            {visibleLots.length === 1 ? "" : "s"} con saldo según los filtros.
          </p>
        </div>
      </div>

      {visibleLots.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<Boxes className="size-5" />}
            title="No hay lotes para mostrar"
            description={
              hasAnyLots
                ? "Prueba con otro filtro o limpia la búsqueda para ver todos los lotes."
                : "Registra la primera entrada de inventario para empezar a controlar existencias."
            }
          />
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1.7fr)_120px_90px_120px_130px_150px] gap-3 border-b border-line bg-canvas/60 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted xl:grid">
            <span>Producto / lote</span>
            <span>Caducidad</span>
            <span className="text-right">Saldo</span>
            <span>Costo</span>
            <span>Recibido</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-line/80">
            {visibleLots.map((lot) => {
              const product = productsById.get(lot.product_id);
              const days = lot.expires_on ? daysUntil(lot.expires_on) : null;
              const expired = days !== null && days < 0;

              return (
                <div
                  key={lot.id}
                  className="px-4 py-4 transition hover:bg-canvas/40 sm:px-5 xl:grid xl:grid-cols-[minmax(0,1.7fr)_120px_90px_120px_130px_150px] xl:items-center xl:gap-3 xl:py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        expired
                          ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger"
                          : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                      }
                    >
                      {expired ? (
                        <TriangleAlert className="size-4" />
                      ) : (
                        <Layers className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/productos/${lot.product_id}`}
                        className="block truncate text-sm font-bold text-ink hover:text-brand"
                      >
                        {product?.name ?? "Producto"}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {product?.sku ?? "—"} · Lote {lot.lot_code}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 xl:mt-0">
                    <span className="text-[11px] font-medium text-muted xl:hidden">
                      {formatDateOnly(lot.expires_on)}
                    </span>
                    {lot.expires_on ? (
                      <Badge
                        tone={
                          expired
                            ? "danger"
                            : days !== null && days <= expiryAlertDays
                              ? "warning"
                              : "success"
                        }
                      >
                        {expired
                          ? "Vencido"
                          : days === 0
                            ? "Vence hoy"
                            : `${days} días`}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Sin caducidad</Badge>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-extrabold text-ink xl:mt-0 xl:text-right">
                    {formatNumber(lot.quantity)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-muted xl:mt-0">
                    {formatMoney(lot.unit_cost)}
                  </p>

                  <p className="mt-1 text-[11px] text-muted xl:mt-0">
                    {formatDateTime(lot.received_at, timeZone)}
                  </p>

                  <div className="mt-3 flex justify-end xl:mt-0">
                    {canManage ? (
                      <LotActions
                        lot={{
                          id: lot.id,
                          productName: product?.name ?? "Producto",
                          lotCode: lot.lot_code,
                          quantity: lot.quantity,
                          expiresOn: lot.expires_on,
                        }}
                      />
                    ) : (
                      <span className="text-[11px] text-muted">Solo lectura</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
