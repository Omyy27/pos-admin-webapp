import { CalendarClock, PackageSearch, TriangleAlert, Warehouse } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";

export function InventoryKpis({
  lotCount,
  totalUnits,
  expiringCount,
  expiredCount,
  expiredUnits,
  lowStockCount,
  expiryAlertDays,
}: {
  lotCount: number;
  totalUnits: number;
  expiringCount: number;
  expiredCount: number;
  expiredUnits: number;
  lowStockCount: number;
  expiryAlertDays: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Lotes con saldo
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(lotCount)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {formatNumber(totalUnits)} unidades en total
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Warehouse className="size-5" />
        </span>
      </Card>

      <Card className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Próximos a vencer
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(expiringCount)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            En los siguientes {expiryAlertDays} días
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-soft text-[#8a5a16]">
          <CalendarClock className="size-5" />
        </span>
      </Card>

      <Card className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Lotes vencidos
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(expiredCount)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {formatNumber(expiredUnits)} unidades bloqueadas
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <TriangleAlert className="size-5" />
        </span>
      </Card>

      <Card className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Stock bajo
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(lowStockCount)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Productos por reponer</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-sky text-[#3a6570]">
          <PackageSearch className="size-5" />
        </span>
      </Card>
    </div>
  );
}
