import { ArrowRight } from "lucide-react";
import { formatDateTime, formatNumber, movementLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { InventoryProduct } from "@/features/inventory/queries";
import type { InventoryMovementRow } from "@/types/database";

export function MovementList({
  movements,
  productsById,
  lotCodes,
  userNames,
  timeZone,
}: {
  movements: InventoryMovementRow[];
  productsById: Map<string, InventoryProduct>;
  lotCodes: Map<string, string>;
  userNames: Map<string, string>;
  timeZone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            Últimos movimientos
          </h2>
          <p className="mt-1 text-xs text-muted">
            Cada entrada, ajuste, venta, anulación y baja queda auditada.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-muted">
          {movements.length} movimientos recientes
        </span>
      </div>

      {movements.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          Todavía no se han registrado movimientos de inventario.
        </p>
      ) : (
        <div className="divide-y divide-line/70">
          {movements.map((movement) => {
            const product = productsById.get(movement.product_id);

            return (
              <div
                key={movement.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={
                      movement.quantity_delta > 0
                        ? "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                        : "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger"
                    }
                  >
                    <ArrowRight
                      className={
                        movement.quantity_delta > 0
                          ? "size-4 -rotate-90"
                          : "size-4 rotate-90"
                      }
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">
                      {product?.name ?? "Producto"}{" "}
                      <span className="font-medium text-muted">
                        · Lote {lotCodes.get(movement.lot_id) ?? "—"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {movementLabel(movement.type)}
                      {movement.reason ? ` · ${movement.reason}` : ""} ·{" "}
                      {formatDateTime(movement.created_at, timeZone)}
                      {userNames.get(movement.created_by)
                        ? ` · ${userNames.get(movement.created_by)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-11 sm:pl-0">
                  <p
                    className={
                      movement.quantity_delta > 0
                        ? "text-sm font-extrabold text-brand"
                        : "text-sm font-extrabold text-danger"
                    }
                  >
                    {movement.quantity_delta > 0 ? "+" : ""}
                    {formatNumber(movement.quantity_delta)}
                  </p>
                  <p className="text-[10px] text-muted">
                    Saldo {formatNumber(movement.resulting_quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
