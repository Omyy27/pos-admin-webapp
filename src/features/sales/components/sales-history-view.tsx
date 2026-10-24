import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  paymentLabel,
  saleStatusLabel,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import {
  SALES_PERIODS,
  type SalesFilters,
  type SalesHistory,
} from "@/features/sales/queries";

export function SalesHistoryView({
  history,
  filters,
  canSeeAll,
  canCreate,
  timeZone,
}: {
  history: SalesHistory;
  filters: SalesFilters;
  canSeeAll: boolean;
  canCreate: boolean;
  timeZone: string;
}) {
  const { sales, itemsBySale, sellerNames, totals } = history;
  const { q, estado, pago, periodo } = filters;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={canSeeAll ? "Caja" : "Mis ventas"}
        title="Historial de ventas"
        description={
          canSeeAll
            ? "Todos los tickets de la tienda con su estado, método de pago y trazabilidad."
            : "Consulta los tickets que registraste. Solo administración puede ver las ventas de todo el equipo."
        }
        actions={
          canCreate ? (
            <Link href="/pos" className={buttonClasses({ variant: "primary" })}>
              <ReceiptText className="size-4" />
              Nueva venta
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Tickets completados
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(totals.completed_count)}
          </p>
          <p className="mt-1 text-[11px] text-muted">En el periodo filtrado</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Ingresos
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatMoney(totals.revenue)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Sin contar anuladas</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Anuladas
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(totals.voided_count)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Con stock restituido</p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <form
          action="/ventas"
          method="get"
          className="grid gap-3 sm:grid-cols-2 min-[1360px]:grid-cols-[minmax(0,1.1fr)_minmax(200px,0.6fr)_minmax(190px,0.6fr)_minmax(145px,0.7fr)_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/60" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por número de ticket…"
              className="pl-10"
              inputMode="numeric"
              aria-label="Buscar ticket"
            />
          </div>
          <Select name="estado" defaultValue={estado} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="voided">Anuladas</option>
          </Select>
          <Select name="pago" defaultValue={pago} aria-label="Método de pago">
            <option value="">Todos los pagos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </Select>
          <Select name="periodo" defaultValue={periodo} aria-label="Periodo">
            {SALES_PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-2 min-[1360px]:col-span-1">
            <button
              type="submit"
              className={buttonClasses({ variant: "primary", className: "flex-1" })}
            >
              <Search className="size-4" />
              Filtrar
            </button>
            <Link href="/ventas" className={buttonClasses({ variant: "ghost" })}>
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      {sales.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-5" />}
          title="No hay ventas con estos filtros"
          description="Cuando se registre una venta aparecerá aquí. También puedes ampliar el periodo o limpiar los filtros."
          action={
            canCreate ? (
              <Link href="/pos" className={buttonClasses({ size: "sm" })}>
                Abrir punto de venta
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[110px_minmax(0,1.3fr)_160px_130px_110px_140px_28px] gap-3 border-b border-line bg-canvas/60 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted xl:grid">
            <span>Ticket</span>
            <span>Vendedor</span>
            <span>Fecha</span>
            <span>Pago</span>
            <span>Artículos</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="divide-y divide-line/80">
            {sales.map((sale) => {
              const summary = itemsBySale.get(sale.id);
              const PaymentIcon =
                sale.payment_method === "cash"
                  ? Banknote
                  : sale.payment_method === "card"
                    ? CreditCard
                    : Wallet;

              return (
                <Link
                  key={sale.id}
                  href={`/ventas/${sale.id}`}
                  className="group block px-4 py-4 transition hover:bg-canvas/60 sm:px-5 xl:grid xl:grid-cols-[110px_minmax(0,1.3fr)_160px_130px_110px_140px_28px] xl:items-center xl:gap-3 xl:py-3.5"
                >
                  <div className="flex items-center justify-between gap-2 xl:block">
                    <p className="text-sm font-extrabold text-ink">
                      #{sale.ticket_number}
                    </p>
                    <span className="xl:hidden">
                      <Badge
                        tone={sale.status === "completed" ? "success" : "danger"}
                      >
                        {saleStatusLabel(sale.status)}
                      </Badge>
                    </span>
                  </div>

                  <div className="mt-1 min-w-0 xl:mt-0">
                    <p className="truncate text-xs font-semibold text-ink">
                      {sellerNames.get(sale.created_by) ?? "Usuario"}
                    </p>
                    <span className="hidden xl:hidden">
                      {formatDateTime(sale.created_at, timeZone)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-muted xl:mt-0">
                    {formatDateTime(sale.created_at, timeZone)}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted xl:mt-0">
                    <PaymentIcon className="size-3.5" />
                    {paymentLabel(sale.payment_method)}
                  </p>

                  <p className="mt-1 text-[11px] text-muted xl:mt-0">
                    {summary
                      ? `${formatNumber(summary.count)} líneas · ${formatNumber(summary.units)} u.`
                      : "—"}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2 xl:mt-0 xl:justify-end">
                    <span className="text-sm font-extrabold text-ink">
                      {formatMoney(sale.total)}
                    </span>
                    <span className="hidden xl:inline">
                      <Badge
                        tone={sale.status === "completed" ? "success" : "danger"}
                      >
                        {saleStatusLabel(sale.status)}
                      </Badge>
                    </span>
                  </div>

                  <ArrowRight className="hidden size-4 text-muted/30 transition group-hover:text-brand xl:block" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
