import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  Layers,
  PackageMinus,
  PackagePlus,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import {
  daysUntil,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatNumber,
  movementLabel,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { LotActions } from "@/components/inventory/lot-actions";
import { ReceiveLotDialog } from "@/components/inventory/receive-lot-dialog";
import type {
  InventoryMovementRow,
  ProductLotRow,
  ProductWithStock,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Detalle del producto",
};

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requirePermission("catalog.read");

  const { data: productData } = await auth.supabase
    .from("products_with_stock")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!productData) notFound();

  const product = productData as ProductWithStock;
  const canSeeInventory = auth.can("inventory.read");
  const canManageInventory = auth.can("inventory.manage");
  const canEdit = auth.can("catalog.manage");

  let lots: ProductLotRow[] = [];
  let movements: InventoryMovementRow[] = [];
  let movementUserNames = new Map<string, string>();

  if (canSeeInventory) {
    const [lotsResult, movementsResult] = await Promise.all([
      auth.supabase
        .from("product_lots")
        .select("*")
        .eq("product_id", id)
        .order("expires_on", { ascending: true, nullsFirst: false }),
      auth.supabase
        .from("inventory_movements")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    lots = lotsResult.data ?? [];
    movements = movementsResult.data ?? [];

    const userIds = [...new Set(movements.map((movement) => movement.created_by))];
    if (userIds.length > 0) {
      const { data: profiles } = await auth.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      movementUserNames = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
      );
    }
  }

  const availableLots = lots.filter((lot) => lot.quantity > 0);
  const totalAvailable = product.available_quantity;

  return (
    <div className="space-y-5">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Volver al catálogo
      </Link>

      <PageHeader
        eyebrow={product.category_name ?? "Sin categoría"}
        title={product.name}
        description={product.description ?? "Sin descripción registrada."}
        actions={
          <>
            {canEdit ? (
              <Link
                href={`/productos/${product.id}/editar`}
                className={buttonClasses({ variant: "outline" })}
              >
                <Pencil className="size-4" />
                Editar
              </Link>
            ) : null}
            {canManageInventory ? (
              <ReceiveLotDialog
                products={[
                  {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    track_lots: product.track_lots,
                  },
                ]}
                initialProductId={product.id}
              />
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{product.sku}</Badge>
        {product.barcode ? (
          <Badge tone="neutral">Código de barras {product.barcode}</Badge>
        ) : null}
        {product.track_lots ? (
          <Badge tone="info">Control por lote y caducidad</Badge>
        ) : (
          <Badge tone="neutral">Sin control de lote</Badge>
        )}
        {product.active ? (
          <Badge tone="success">Activo</Badge>
        ) : (
          <Badge tone="neutral">Inactivo</Badge>
        )}
        {product.low_stock ? <Badge tone="warning">Stock bajo</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Precio de venta
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatMoney(product.sale_price)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Impuesto incluido</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Disponible
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(totalAvailable)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Mínimo configurado: {formatNumber(product.min_stock)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Próximo vencimiento
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatDateOnly(product.nearest_expiry)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {product.track_lots ? "Lotes vigentes" : "Producto sin caducidad"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Lotes vencidos
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
            {formatNumber(product.expired_quantity)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Unidades no vendibles</p>
        </Card>
      </div>

      {!canSeeInventory ? (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Boxes className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Consulta de existencias</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Tu rol puede consultar la disponibilidad, pero los lotes, costos
                y movimientos están reservados para el equipo de inventario.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  Lotes
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Salida FEFO: primero vence, primero sale. Los vencidos no se
                  pueden vender.
                </p>
              </div>
              <Link
                href={`/inventario?producto=${product.id}`}
                className="text-xs font-bold text-brand hover:text-brand-deep"
              >
                Abrir en inventario
              </Link>
            </div>

            {availableLots.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<PackageMinus className="size-5" />}
                  title="Sin existencias por lote"
                  description="Registra una entrada para que el producto tenga unidades disponibles en el punto de venta."
                  action={
                    canManageInventory ? (
                      <ReceiveLotDialog
                        products={[
                          {
                            id: product.id,
                            name: product.name,
                            sku: product.sku,
                            track_lots: product.track_lots,
                          },
                        ]}
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
                {availableLots.map((lot) => {
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
                        {canManageInventory ? (
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
                        {formatDateTime(movement.created_at, auth.settings.timezone)}
                        {movementUserNames.get(movement.created_by)
                          ? ` · ${movementUserNames.get(movement.created_by)}`
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
        </>
      )}

      {canManageInventory ? (
        <div className="flex justify-end">
          <Link
            href={`/inventario?producto=${product.id}`}
            className={buttonClasses({ variant: "soft" })}
          >
            <PackagePlus className="size-4" />
            Gestionar lotes de este producto
          </Link>
        </div>
      ) : null}
    </div>
  );
}
