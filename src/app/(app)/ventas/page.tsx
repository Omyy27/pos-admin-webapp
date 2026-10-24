import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";
import { requireAuthContext } from "@/lib/auth/context";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  getPeriodRange,
  paymentLabel,
  saleStatusLabel,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { SaleItemRow, SaleRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Ventas",
};

export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo el historial" },
] as const;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAuthContext();
  const canSeeSales =
    auth.can("sales.read_all") || auth.can("sales.read_own");

  if (!canSeeSales) redirect("/sin-permiso");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const estado =
    typeof params.estado === "string" &&
    ["completed", "voided"].includes(params.estado)
      ? params.estado
      : "";
  const pago =
    typeof params.pago === "string" &&
    ["cash", "card", "transfer"].includes(params.pago)
      ? params.pago
      : "";
  const periodo =
    typeof params.periodo === "string" &&
    PERIODS.some((item) => item.value === params.periodo)
      ? (params.periodo as (typeof PERIODS)[number]["value"])
      : "month";

  const range = getPeriodRange(periodo, auth.settings.timezone);
  const ticketQuery = q.replace(/^#/, "");

  let query = auth.supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (range.start) {
    query = query.gte("created_at", range.start).lte("created_at", range.end);
  } else {
    query = query.lte("created_at", range.end);
  }

  if (estado) query = query.eq("status", estado as "completed" | "voided");
  if (pago) {
    query = query.eq("payment_method", pago as "cash" | "card" | "transfer");
  }
  if (ticketQuery && /^\d+$/.test(ticketQuery)) {
    query = query.eq("ticket_number", Number(ticketQuery));
  }

  const totalsQuery = auth.supabase.rpc("sales_totals", {
    p_start: range.start,
    p_end: range.end,
    p_status: estado ? (estado as "completed" | "voided") : null,
    p_payment_method: pago
      ? (pago as "cash" | "card" | "transfer")
      : null,
    p_ticket_number:
      ticketQuery && /^\d+$/.test(ticketQuery)
        ? Number(ticketQuery)
        : null,
  });

  const [
    { data: salesData, error },
    { data: totalsData, error: totalsError },
  ] = await Promise.all([query, totalsQuery]);

  if (error) {
    throw new Error(`No se pudieron cargar las ventas: ${error.message}`);
  }

  if (totalsError) {
    throw new Error(`No se pudieron calcular los totales: ${totalsError.message}`);
  }

  const totals = (totalsData ?? {
    completed_count: 0,
    voided_count: 0,
    revenue: 0,
  }) as {
    completed_count: number;
    voided_count: number;
    revenue: number;
  };

  const sales = (salesData ?? []) as SaleRow[];
  const saleIds = sales.map((sale) => sale.id);

  let items: Pick<SaleItemRow, "sale_id" | "quantity">[] = [];
  let sellerNames = new Map<string, string>();

  if (saleIds.length > 0) {
    const sellerIds = [...new Set(sales.map((sale) => sale.created_by))];
    const [itemsResult, profilesResult] = await Promise.all([
      auth.supabase
        .from("sale_items")
        .select("sale_id, quantity")
        .in("sale_id", saleIds),
      auth.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", sellerIds),
    ]);

    items = itemsResult.data ?? [];
    sellerNames = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.full_name,
      ]),
    );
  }

  const itemsBySale = new Map<string, { count: number; units: number }>();
  for (const item of items) {
    const current = itemsBySale.get(item.sale_id) ?? { count: 0, units: 0 };
    current.count += 1;
    current.units += item.quantity;
    itemsBySale.set(item.sale_id, current);
  }



  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={auth.can("sales.read_all") ? "Caja" : "Mis ventas"}
        title="Historial de ventas"
        description={
          auth.can("sales.read_all")
            ? "Todos los tickets de la tienda con su estado, método de pago y trazabilidad."
            : "Consulta los tickets que registraste. Solo administración puede ver las ventas de todo el equipo."
        }
        actions={
          auth.can("sales.create") ? (
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
            {PERIODS.map((item) => (
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
            auth.can("sales.create") ? (
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
                      {formatDateTime(sale.created_at, auth.settings.timezone)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-muted xl:mt-0">
                    {formatDateTime(sale.created_at, auth.settings.timezone)}
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
