import Link from "next/link";
import { PackageSearch, Search } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ReceiveLotDialog } from "@/features/inventory/components/receive-lot-dialog";
import { InventoryKpis } from "@/features/inventory/components/inventory-kpis";
import { LotTable } from "@/features/inventory/components/lot-table";
import { MovementList } from "@/features/inventory/components/movement-list";
import {
  INVENTORY_FILTERS,
  type InventoryFilters,
  type InventoryOverview,
} from "@/features/inventory/queries";

export function InventoryView({
  data,
  filters,
  canManage,
  expiryAlertDays,
  timeZone,
}: {
  data: InventoryOverview;
  filters: InventoryFilters;
  canManage: boolean;
  expiryAlertDays: number;
  timeZone: string;
}) {
  const {
    categories,
    allLots,
    lowStock,
    movements,
    productsById,
    movementLotCodes,
    movementUserNames,
    visibleLots,
    totalUnits,
    expiringCount,
    expiredCount,
    expiredUnits,
    activeProducts,
    selectedProduct,
  } = data;
  const { q, categoria, filtro, producto } = filters;

  const productsForDialog = activeProducts.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    track_lots: product.track_lots,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación"
        title="Inventario"
        description="Entradas, ajustes, bajas y vencimientos con trazabilidad por lote. El stock disponible se calcula solo con lotes vigentes."
        actions={
          canManage ? (
            <ReceiveLotDialog products={productsForDialog} />
          ) : null
        }
      />

      <InventoryKpis
        lotCount={allLots.length}
        totalUnits={totalUnits}
        expiringCount={expiringCount}
        expiredCount={expiredCount}
        expiredUnits={expiredUnits}
        lowStockCount={lowStock.length}
        expiryAlertDays={expiryAlertDays}
      />

      <Card className="p-4 sm:p-5">
        <form
          action="/inventario"
          method="get"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(215px,0.6fr)_minmax(185px,0.7fr)_auto]"
        >
          {producto ? (
            <input type="hidden" name="producto" value={producto} />
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/60" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por producto, SKU o lote…"
              className="pl-10"
              aria-label="Buscar inventario"
            />
          </div>
          <Select name="categoria" defaultValue={categoria} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select name="filtro" defaultValue={filtro} aria-label="Tipo de lote">
            {INVENTORY_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <button
              type="submit"
              className={buttonClasses({ variant: "primary", className: "flex-1" })}
            >
              <Search className="size-4" />
              Filtrar
            </button>
            <Link
              href="/inventario"
              className={buttonClasses({ variant: "ghost" })}
            >
              Limpiar
            </Link>
          </div>
        </form>

        {selectedProduct ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/60 px-3 py-2 text-xs font-semibold text-brand-deep">
            Mostrando solo {selectedProduct.name} ({selectedProduct.sku})
            <Link
              href={`/inventario?filtro=${filtro}`}
              className="ml-auto text-[11px] font-bold underline decoration-brand/30 underline-offset-2 hover:text-brand"
            >
              Quitar filtro
            </Link>
          </div>
        ) : null}
      </Card>

      {lowStock.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <PackageSearch className="size-4 text-[#8a5a16]" />
                Reposición sugerida
              </h2>
              <p className="mt-1 text-xs text-muted">
                Productos en su stock mínimo o por debajo.
              </p>
            </div>
            <Link
              href="/inventario?filtro=stock_bajo"
              className="text-xs font-bold text-brand hover:text-brand-deep"
            >
              Ver solo estos lotes
            </Link>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {lowStock.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface-strong px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/productos/${product.id}`}
                    className="truncate text-xs font-bold text-ink hover:text-brand"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatNumber(product.available_quantity)} disp. · mínimo{" "}
                    {formatNumber(product.min_stock)}
                  </p>
                </div>
                {canManage ? (
                  <ReceiveLotDialog
                    products={productsForDialog}
                    initialProductId={product.id}
                    triggerLabel="Abastecer"
                    triggerVariant="soft"
                    triggerSize="sm"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <LotTable
        visibleLots={visibleLots}
        hasAnyLots={allLots.length > 0}
        productsById={productsById}
        canManage={canManage}
        expiryAlertDays={expiryAlertDays}
        timeZone={timeZone}
      />

      <MovementList
        movements={movements}
        productsById={productsById}
        lotCodes={movementLotCodes}
        userNames={movementUserNames}
        timeZone={timeZone}
      />
    </div>
  );
}
