import { formatDateTime, formatNumber, movementLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { InventoryMovementRow } from "@/types/database";

export function ProductMovementsCard({
  movements,
  userNames,
  timeZone,
}: {
  movements: InventoryMovementRow[];
  userNames: Map<string, string>;
  timeZone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-xl font-semibold text-ink">
          Movimientos recientes
        </h2>
        <p className="mt-1 text-xs text-muted">
          Bitácora de entradas, ventas, ajustes y bajas de este producto.
        </p>
      </div>

      {movements.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          Aún no hay movimientos registrados.
        </p>
      ) : (
        <div className="divide-y divide-line/70">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink">
                  {movementLabel(movement.type)}
                  {movement.reason ? (
                    <span className="font-medium text-muted">
                      {" "}
                      · {movement.reason}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {formatDateTime(movement.created_at, timeZone)}
                  {userNames.get(movement.created_by)
                    ? ` · ${userNames.get(movement.created_by)}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
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
          ))}
        </div>
      )}
    </Card>
  );
}
