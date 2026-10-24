import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  Printer,
  ReceiptText,
  UserRound,
  Wallet,
} from "lucide-react";
import { requireAuthContext } from "@/lib/auth/context";
import {
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatNumber,
  paymentLabel,
  saleStatusLabel,
} from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import type { ProductLotRow, SaleItemRow, SaleRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Detalle de venta",
};

export const dynamic = "force-dynamic";

type LotUsage = {
  lotId: string;
  lotCode: string;
  expiresOn: string | null;
  quantity: number;
  unitCost: number;
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireAuthContext();
  const canSeeSales =
    auth.can("sales.read_all") || auth.can("sales.read_own");

  if (!canSeeSales) redirect("/sin-permiso");

  const { data: saleData } = await auth.supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!saleData) notFound();

  const sale = saleData as SaleRow;

  const { data: itemsData } = await auth.supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", sale.id)
    .order("created_at", { ascending: true });

  const items = (itemsData ?? []) as SaleItemRow[];
  const canSeeCosts = auth.can("sales.read_all") && auth.can("inventory.read");

  const userIds = [sale.created_by, sale.voided_by].filter(
    (value): value is string => Boolean(value),
  );

  const profilesPromise =
    userIds.length > 0
      ? auth.supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] });

  const lotsByItem = new Map<string, LotUsage[]>();
  let totalCost = 0;

  if (canSeeCosts && items.length > 0) {
    const { data: usageRows } = await auth.supabase
      .from("sale_item_lots")
      .select("*")
      .in(
        "sale_item_id",
        items.map((item) => item.id),
      );

    const lotIds = [...new Set((usageRows ?? []).map((row) => row.lot_id))];

    if (lotIds.length > 0) {
      const { data: lotData } = await auth.supabase
        .from("product_lots")
        .select("id, lot_code, expires_on")
        .in("id", lotIds);

      const lotsById = new Map(
        ((lotData ?? []) as Pick<
          ProductLotRow,
          "id" | "lot_code" | "expires_on"
        >[]).map((lot) => [lot.id, lot]),
      );

      for (const row of usageRows ?? []) {
        const lot = lotsById.get(row.lot_id);
        const list = lotsByItem.get(row.sale_item_id) ?? [];
        list.push({
          lotId: row.lot_id,
          lotCode: lot?.lot_code ?? "—",
          expiresOn: lot?.expires_on ?? null,
          quantity: row.quantity,
          unitCost: Number(row.unit_cost),
        });
        lotsByItem.set(row.sale_item_id, list);
        totalCost += row.quantity * Number(row.unit_cost);
      }
    }
  }

  const { data: profiles } = await profilesPromise;
  const profileNames = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );

  const PaymentIcon =
    sale.payment_method === "cash"
      ? Banknote
      : sale.payment_method === "card"
        ? CreditCard
        : Wallet;
  const grossMargin = Number(sale.total) - totalCost;

  return (
    <div className="space-y-5">
      <Link
        href="/ventas"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Volver al historial
      </Link>

      <PageHeader
        eyebrow="Ticket"
        title={`Venta #${sale.ticket_number}`}
        description={`Registrada el ${formatDateTime(sale.created_at, auth.settings.timezone)} por ${
          profileNames.get(sale.created_by) ?? "un usuario"
        }.`}
        actions={
          <>
            <Link
              href={`/ventas/${sale.id}/ticket`}
              target="_blank"
              className={buttonClasses({ variant: "outline" })}
            >
              <Printer className="size-4" />
              Ver ticket
            </Link>
            {auth.can("sales.void") && sale.status === "completed" ? (
              <VoidSaleDialog
                saleId={sale.id}
                ticketNumber={sale.ticket_number}
              />
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={sale.status === "completed" ? "success" : "danger"}>
          {saleStatusLabel(sale.status)}
        </Badge>
        <Badge tone="neutral">
          <CalendarDays className="size-3" />
          {formatDateTime(sale.created_at, auth.settings.timezone)}
        </Badge>
        <Badge tone="info">
          <PaymentIcon className="size-3" />
          {paymentLabel(sale.payment_method)}
        </Badge>
      </div>

      {sale.status === "voided" ? (
        <div className="rounded-2xl border border-[#efd2ce] bg-danger-soft px-5 py-4">
          <p className="text-sm font-bold text-danger">
            Venta anulada
            {sale.voided_at
              ? ` el ${formatDateTime(sale.voided_at, auth.settings.timezone)}`
              : ""}
            {sale.voided_by
              ? ` por ${profileNames.get(sale.voided_by) ?? "un administrador"}`
              : ""}
            .
          </p>
          {sale.void_reason ? (
            <p className="mt-1 text-xs leading-relaxed text-danger/80">
              Motivo: {sale.void_reason}
            </p>
          ) : null}
          <p className="mt-1 text-xs leading-relaxed text-danger/70">
            Las unidades ya fueron devueltas a sus lotes de origen.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Total cobrado
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatMoney(sale.total)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {auth.settings.prices_include_tax
              ? "Impuesto incluido"
              : "Antes de impuesto"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Artículos
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {formatNumber(items.length)} línea{items.length === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Método de pago
          </p>
          <p className="mt-2 flex items-center gap-2 text-lg font-extrabold text-ink">
            <PaymentIcon className="size-5 text-brand" />
            {paymentLabel(sale.payment_method)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Pago único</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Vendedor
          </p>
          <p className="mt-2 flex items-center gap-2 truncate text-sm font-extrabold text-ink">
            <UserRound className="size-4 shrink-0 text-brand" />
            {profileNames.get(sale.created_by) ?? "Usuario"}
          </p>
          <p className="mt-1 text-[11px] text-muted">Responsable del ticket</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,0.7fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <ReceiptText className="size-4 text-brand" />
            <h2 className="font-display text-xl font-semibold text-ink">
              Productos vendidos
            </h2>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              Esta venta no tiene líneas registradas.
            </p>
          ) : (
            <div className="divide-y divide-line/80">
              {items.map((item) => {
                const usages = lotsByItem.get(item.id) ?? [];
                const itemCost = usages.reduce(
                  (sum, usage) => sum + usage.quantity * usage.unitCost,
                  0,
                );

                return (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">
                          {item.product_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {item.product_sku} · {formatNumber(item.quantity)} ×{" "}
                          {formatMoney(item.unit_price)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-extrabold text-ink">
                        {formatMoney(item.line_total)}
                      </p>
                    </div>

                    {canSeeCosts && usages.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {usages.map((usage) => (
                          <span
                            key={usage.lotId}
                            className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-1 text-[10px] font-medium text-muted"
                          >
                            Lote {usage.lotCode} · {formatNumber(usage.quantity)} u.
                            {usage.expiresOn
                              ? ` · vence ${formatDateOnly(usage.expiresOn)}`
                              : ""}
                          </span>
                        ))}
                        <span className="inline-flex items-center rounded-md bg-canvas px-2 py-1 text-[10px] font-bold text-muted">
                          Costo {formatMoney(itemCost)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-display text-xl font-semibold text-ink">Resumen</h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-bold text-ink">{formatMoney(sale.total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Impuesto</dt>
              <dd className="text-xs font-semibold text-muted">
                {auth.settings.prices_include_tax ? "Incluido" : "No aplica"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="text-xl font-extrabold tracking-[-0.03em] text-ink">
                {formatMoney(sale.total)}
              </dd>
            </div>

            {canSeeCosts ? (
              <>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <dt className="text-muted">Costo de lotes</dt>
                  <dd className="font-bold text-ink">{formatMoney(totalCost)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Margen bruto</dt>
                  <dd
                    className={
                      grossMargin >= 0
                        ? "font-extrabold text-brand"
                        : "font-extrabold text-danger"
                    }
                  >
                    {formatMoney(grossMargin)}
                  </dd>
                </div>
                <p className="pt-1 text-[10px] leading-relaxed text-muted">
                  Información de costos visible solo para administración e
                  inventario.
                </p>
              </>
            ) : null}
          </dl>

          <Link
            href={`/ventas/${sale.id}/ticket`}
            target="_blank"
            className={buttonClasses({
              variant: "outline",
              className: "mt-4 w-full",
            })}
          >
            <Printer className="size-4" />
            Abrir ticket imprimible
          </Link>
        </Card>
      </div>
    </div>
  );
}
