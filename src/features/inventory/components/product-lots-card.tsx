import Link from "next/link";
import { CalendarClock, Layers, PackageMinus, TriangleAlert } from "lucide-react";
import {
  daysUntil,
  formatDateOnly,
  formatMoney,
  formatNumber,
} from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { LotActions } from "@/features/inventory/components/lot-actions";
import { ReceiveLotDialog } from "@/features/inventory/components/receive-lot-dialog";
import type { ProductLotRow, ProductWithStock } from "@/types/database";

export function ProductLotsCard({
  product,
  lots,
  canManage,
}: {
  product: ProductWithStock;
  lots: ProductLotRow[];
  canManage: boolean;
}) {
  const productOption = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    track_lots: product.track_lots,
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Lotes</h2>
          <p className="mt-1 text-xs text-muted">
            Salida FEFO: primero vence, primero sale. Los vencidos no se pueden
            vender.
          </p>
        </div>
        <Link
          href={`/inventario?producto=${product.id}`}
          className="text-xs font-bold text-brand hover:text-brand-deep"
        >
          Abrir en inventario
        </Link>
      </div>

      {lots.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<PackageMinus className="size-5" />}
            title="Sin existencias por lote"
            description="Registra una entrada para que el producto tenga unidades disponibles en el punto de venta."
            action={
              canManage ? (
                <ReceiveLotDialog
                  products={[productOption]}
                  initialProductId={product.id}
                  triggerLabel="Registrar primera entrada"
                  triggerSize="sm"
                />
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-line/80">
          {lots.map((lot) => {
            const days = lot.expires_on ? daysUntil(lot.expires_on) : null;
            const expired = days !== null && days < 0;

            return (
              <div
                key={lot.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={
                      expired
                        ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger"
                        : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                    }
                  >
                    {expired ? (
                      <TriangleAlert className="size-[18px]" />
                    ) : (
                      <Layers className="size-[18px]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      Lote {lot.lot_code}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <span>{formatNumber(lot.quantity)} unidades</span>
                      <span aria-hidden="true">·</span>
                      <span>Costo {formatMoney(lot.unit_cost)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {formatDateOnly(lot.expires_on)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                  {lot.expires_on ? (
                    <Badge
                      tone={
                        expired
                          ? "danger"
                          : days !== null && days <= 30
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
                  {canManage ? (
                    <LotActions
                      lot={{
                        id: lot.id,
                        productName: product.name,
                        lotCode: lot.lot_code,
                        quantity: lot.quantity,
                        expiresOn: lot.expires_on,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
