import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CalendarClock,
  Clock3,
  PackagePlus,
  PackageX,
  Plus,
  ReceiptText,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import {
  daysUntil,
  firstName,
  formatDateTime,
  formatMoney,
  formatNumber,
  paymentLabel,
  saleStatusLabel,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardOverview } from "@/features/dashboard/queries";

type KpiTone = "brand" | "amber" | "sky" | "neutral";

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
}) {
  const tones: Record<KpiTone, string> = {
    brand: "bg-brand-soft text-brand",
    amber: "bg-amber-soft text-[#95621a]",
    sky: "bg-sky text-[#3a6570]",
    neutral: "bg-canvas text-muted",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.11em] text-muted">
          {label}
        </p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-4 text-[1.7rem] font-extrabold leading-none tracking-[-0.04em] text-ink">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs font-medium text-muted">{detail}</p>
      ) : null}
    </Card>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DashboardView({
  data,
  profileName,
  storeName,
  roleName,
  timeZone,
  expiryAlertDays,
  greeting,
  todayLabel,
  canSeeSales,
  canSeeInventory,
  canManageInventory,
  canCreateSale,
  canManageCatalog,
}: {
  data: DashboardOverview;
  profileName: string;
  storeName: string;
  roleName: string;
  timeZone: string;
  expiryAlertDays: number;
  greeting: string;
  todayLabel: string;
  canSeeSales: boolean;
  canSeeInventory: boolean;
  canManageInventory: boolean;
  canCreateSale: boolean;
  canManageCatalog: boolean;
}) {
  const {
    lowStock,
    activeProducts,
    lotsDue,
    dueProductNames,
    todaySales,
    completedCount,
    voidedCount,
    revenue,
    averageTicket,
    unitsSold,
    topProducts,
    topQuantity,
    expiringCount,
    expiredCount,
  } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumen operativo"
        title={`${greeting}, ${firstName(profileName)}`}
        description={`Esto es lo que está pasando hoy en ${storeName}.`}
        actions={
          <>
            {canManageInventory ? (
              <Link
                href="/inventario"
                className={buttonClasses({ variant: "outline" })}
              >
                <PackagePlus className="size-4" />
                Gestionar inventario
              </Link>
            ) : null}
            {canCreateSale ? (
              <Link href="/pos" className={buttonClasses({ variant: "primary" })}>
                <ScanLine className="size-4" />
                Nueva venta
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-semibold">
          <Clock3 className="size-3.5" />
          {todayLabel}
        </span>
        <Badge tone="brand">{roleName}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canSeeSales ? (
          <>
            <KpiCard
              label="Ventas de hoy"
              value={formatNumber(completedCount)}
              detail={`${voidedCount} anuladas`}
              icon={ReceiptText}
              tone="brand"
            />
            <KpiCard
              label="Ingresos de hoy"
              value={formatMoney(revenue)}
              detail="Precios con impuesto incluido"
              icon={Banknote}
              tone="sky"
            />
            <KpiCard
              label="Ticket promedio"
              value={formatMoney(averageTicket)}
              detail={`${formatNumber(unitsSold)} unidades vendidas`}
              icon={TrendingUp}
              tone="neutral"
            />
            <KpiCard
              label="Stock bajo"
              value={formatNumber(lowStock.length)}
              detail={lowStock.length > 0 ? "Revisa las existencias" : "Todo en orden"}
              icon={PackageX}
              tone={lowStock.length > 0 ? "amber" : "neutral"}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Productos activos"
              value={formatNumber(activeProducts)}
              detail="En el catálogo"
              icon={Boxes}
              tone="brand"
            />
            <KpiCard
              label="Stock bajo"
              value={formatNumber(lowStock.length)}
              detail={lowStock.length > 0 ? "Requieren reposición" : "Todo en orden"}
              icon={PackageX}
              tone={lowStock.length > 0 ? "amber" : "neutral"}
            />
            <KpiCard
              label="Por vencer"
              value={formatNumber(expiringCount)}
              detail={`Próximos ${expiryAlertDays} días`}
              icon={CalendarClock}
              tone="amber"
            />
            <KpiCard
              label="Lotes vencidos"
              value={formatNumber(expiredCount)}
              detail="Pendientes de baja"
              icon={AlertTriangle}
              tone={expiredCount > 0 ? "amber" : "neutral"}
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.9fr)]">
        <div className="space-y-5">
          {canSeeSales ? (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <SectionTitle
                  title="Ventas recientes"
                  subtitle="Movimientos de caja registrados hoy"
                  action={
                    <Link
                      href="/ventas"
                      className="text-xs font-bold text-brand hover:text-brand-deep"
                    >
                      Ver historial
                    </Link>
                  }
                />
              </div>

              {todaySales.length === 0 ? (
                <div className="px-5 py-8 sm:px-6">
                  <EmptyState
                    icon={<ReceiptText className="size-5" />}
                    title="Aún no hay ventas hoy"
                    description="Cuando registres la primera venta, aparecerá aquí con su ticket y método de pago."
                    action={
                      canCreateSale ? (
                        <Link href="/pos" className={buttonClasses({ size: "sm" })}>
                          <Plus className="size-4" />
                          Abrir punto de venta
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/80">
                  {todaySales.slice(0, 5).map((sale) => (
                    <Link
                      key={sale.id}
                      href={`/ventas/${sale.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-canvas/70 sm:px-6"
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          sale.status === "completed"
                            ? "bg-brand-soft text-brand"
                            : "bg-danger-soft text-danger",
                        )}
                      >
                        <ReceiptText className="size-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">
                          Ticket #{sale.ticket_number}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted">
                          {formatDateTime(sale.created_at, timeZone)} ·{" "}
                          {paymentLabel(sale.payment_method)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-ink">
                          {formatMoney(sale.total)}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          {saleStatusLabel(sale.status)}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted/40" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {canSeeSales && topProducts.length > 0 ? (
            <Card className="p-5 sm:p-6">
              <SectionTitle
                title="Más vendidos hoy"
                subtitle="Por unidades vendidas en tickets completados"
              />
              <div className="mt-5 space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-canvas text-[10px] font-bold text-muted">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-ink">
                          {product.name}
                        </p>
                        <span className="text-xs font-bold text-muted">
                          {formatNumber(product.quantity)} u.
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.max(8, (product.quantity / topQuantity) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle
              title="Requiere atención"
              subtitle="Existencias y caducidades"
              action={
                lowStock.length > 0 ? (
                  <Badge tone="warning">{lowStock.length}</Badge>
                ) : (
                  <Badge tone="success">Al día</Badge>
                )
              }
            />

            <div className="mt-4 space-y-2.5">
              {lowStock.length === 0 ? (
                <div className="rounded-xl bg-brand-soft/60 px-3.5 py-4 text-xs leading-relaxed text-brand-deep">
                  Ningún producto está por debajo de su stock mínimo. Buen
                  trabajo.
                </div>
              ) : (
                lowStock.map((product) => (
                  <Link
                    key={product.id}
                    href={`/productos/${product.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface-strong px-3 py-2.5 transition hover:border-brand/30"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-soft text-[#95621a]">
                      <PackageX className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {formatNumber(product.available_quantity)} disponibles ·
                        mínimo {formatNumber(product.min_stock)}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted/40" />
                  </Link>
                ))
              )}
            </div>

            {canSeeInventory ? (
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <CalendarClock className="size-4 text-[#95621a]" />
                    Caducidades próximas
                  </p>
                  <Link
                    href="/inventario?filtro=por_vencer"
                    className="text-[11px] font-bold text-brand hover:text-brand-deep"
                  >
                    Revisar
                  </Link>
                </div>

                <div className="mt-3 space-y-2">
                  {lotsDue.length === 0 ? (
                    <p className="text-xs leading-relaxed text-muted">
                      No hay lotes vencidos ni próximos a vencer en los
                      siguientes {expiryAlertDays} días.
                    </p>
                  ) : (
                    lotsDue.slice(0, 4).map((lot) => {
                      const days = lot.expires_on ? daysUntil(lot.expires_on) : null;
                      return (
                        <div
                          key={lot.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-ink">
                              {dueProductNames.get(lot.product_id) ?? "Producto"}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted">
                              Lote {lot.lot_code} · {formatNumber(lot.quantity)} u.
                            </p>
                          </div>
                          <Badge tone={days !== null && days < 0 ? "danger" : "warning"}>
                            {days !== null && days < 0
                              ? "Vencido"
                              : `${days ?? 0} días`}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </Card>

          {canManageCatalog ? (
            <Card className="overflow-hidden bg-brand-deep p-5 text-white">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-brand-deep">
                  <PackagePlus className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">
                    Mantén el catálogo al día
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    Registra productos y sus lotes; el POS calculará el stock y
                    la salida FEFO por ti.
                  </p>
                  <Link
                    href="/productos/nuevo"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-lime hover:text-white"
                  >
                    Crear producto
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
