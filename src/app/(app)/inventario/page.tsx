import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  Layers,
  PackageSearch,
  Search,
  TriangleAlert,
  Warehouse,
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
import { Input, Select } from "@/components/ui/field";
import { ReceiveLotDialog } from "@/components/inventory/receive-lot-dialog";
import { LotActions } from "@/components/inventory/lot-actions";
import type {
  CategoryRow,
  InventoryMovementRow,
  ProductLotRow,
  ProductRow,
  ProductWithStock,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Inventario",
};

export const dynamic = "force-dynamic";

type ProductLite = Pick<
  ProductRow,
  "id" | "name" | "sku" | "track_lots" | "active" | "category_id"
>;

const FILTERS = [
  { value: "todos", label: "Todos los lotes" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencidos", label: "Vencidos" },
  { value: "sin_caducidad", label: "Sin caducidad" },
  { value: "stock_bajo", label: "Productos con stock bajo" },
] as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("inventory.read");
  const params = await searchParams;
  const timeZone = auth.settings.timezone;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const categoria =
    typeof params.categoria === "string" ? params.categoria : "";
  const producto = typeof params.producto === "string" ? params.producto : "";
  const filtro =
    typeof params.filtro === "string" &&
    FILTERS.some((item) => item.value === params.filtro)
      ? params.filtro
      : "todos";

  const [productsResult, categoriesResult, lotsResult, lowStockResult, movementsResult] =
    await Promise.all([
      auth.supabase
        .from("products")
        .select("id, name, sku, track_lots, active, category_id")
        .order("name"),
      auth.supabase.from("categories").select("*").order("name"),
      auth.supabase
        .from("product_lots")
        .select("*")
        .gt("quantity", 0)
        .order("expires_on", { ascending: true, nullsFirst: false })
        .limit(1000),
      auth.supabase
        .from("products_with_stock")
        .select("*")
        .eq("active", true)
        .eq("low_stock", true)
        .order("available_quantity", { ascending: true })
        .limit(30),
      auth.supabase
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const products = (productsResult.data ?? []) as ProductLite[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const allLots = (lotsResult.data ?? []) as ProductLotRow[];
  const lowStock = (lowStockResult.data ?? []) as ProductWithStock[];
  const movements = (movementsResult.data ?? []) as InventoryMovementRow[];

  const productsById = new Map(products.map((product) => [product.id, product]));
  const lowStockIds = new Set(lowStock.map((product) => product.id));

  const visibleLots = allLots.filter((lot) => {
    const product = productsById.get(lot.product_id);
    if (!product) return false;
    if (producto && lot.product_id !== producto) return false;
    if (categoria && product.category_id !== categoria) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !product.name.toLowerCase().includes(needle) &&
        !product.sku.toLowerCase().includes(needle) &&
        !lot.lot_code.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    if (filtro === "por_vencer") {
      if (!lot.expires_on) return false;
      const days = daysUntil(lot.expires_on);
      if (days === null || days < 0 || days > auth.settings.expiry_alert_days) {
        return false;
      }
    }
    if (filtro === "vencidos") {
      if (!lot.expires_on || daysUntil(lot.expires_on)! >= 0) return false;
    }
    if (filtro === "sin_caducidad" && lot.expires_on) return false;
    if (filtro === "stock_bajo" && !lowStockIds.has(lot.product_id)) return false;
    return true;
  });

  const totalUnits = allLots.reduce((sum, lot) => sum + lot.quantity, 0);
  const expiringLots = allLots.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days >= 0 && days <= auth.settings.expiry_alert_days;
  });
  const expiredLots = allLots.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days < 0;
  });

  const activeProducts = products.filter((product) => product.active);
  const canManage = auth.can("inventory.manage");
  const selectedProduct = producto ? productsById.get(producto) : undefined;

  let movementLotCodes = new Map<string, string>();
  let movementUserNames = new Map<string, string>();

  if (movements.length > 0) {
    const lotIds = [...new Set(movements.map((movement) => movement.lot_id))];
    const userIds = [...new Set(movements.map((movement) => movement.created_by))];

    const [lotsForMovements, profiles] = await Promise.all([
      auth.supabase
        .from("product_lots")
        .select("id, lot_code")
        .in("id", lotIds),
      auth.supabase.from("profiles").select("id, full_name").in("id", userIds),
    ]);

    movementLotCodes = new Map(
      (lotsForMovements.data ?? []).map((lot) => [lot.id, lot.lot_code]),
    );
    movementUserNames = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile.full_name]),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación"
        title="Inventario"
        description="Entradas, ajustes, bajas y vencimientos con trazabilidad por lote. El stock disponible se calcula solo con lotes vigentes."
        actions={
          canManage ? (
            <ReceiveLotDialog
              products={activeProducts.map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                track_lots: product.track_lots,
              }))}
            />
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
              Lotes con saldo
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
              {formatNumber(allLots.length)}
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
              {formatNumber(expiringLots.length)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              En los siguientes {auth.settings.expiry_alert_days} días
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
              {formatNumber(expiredLots.length)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {formatNumber(
                expiredLots.reduce((sum, lot) => sum + lot.quantity, 0),
              )}{" "}
              unidades bloqueadas
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
              {formatNumber(lowStock.length)}
            </p>
            <p className="mt-1 text-[11px] text-muted">Productos por reponer</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-sky text-[#3a6570]">
            <PackageSearch className="size-5" />
          </span>
        </Card>
      </div>

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
            {FILTERS.map((item) => (
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
                    products={activeProducts.map((item) => ({
                      id: item.id,
                      name: item.name,
                      sku: item.sku,
                      track_lots: item.track_lots,
                    }))}
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

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              <Layers className="size-5 text-brand" />
              Lotes
            </h2>
            <p className="mt-1 text-xs text-muted">
              {formatNumber(visibleLots.length)} lote
              {visibleLots.length === 1 ? "" : "s"} con saldo según los filtros.
            </p>
          </div>
        </div>

        {visibleLots.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Boxes className="size-5" />}
              title="No hay lotes para mostrar"
              description={
                allLots.length === 0
                  ? "Registra la primera entrada de inventario para empezar a controlar existencias."
                  : "Prueba con otro filtro o limpia la búsqueda para ver todos los lotes."
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.7fr)_120px_90px_120px_130px_150px] gap-3 border-b border-line bg-canvas/60 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted xl:grid">
              <span>Producto / lote</span>
              <span>Caducidad</span>
              <span className="text-right">Saldo</span>
              <span>Costo</span>
              <span>Recibido</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-line/80">
              {visibleLots.map((lot) => {
                const product = productsById.get(lot.product_id);
                const days = lot.expires_on ? daysUntil(lot.expires_on) : null;
                const expired = days !== null && days < 0;

                return (
                  <div
                    key={lot.id}
                    className="px-4 py-4 transition hover:bg-canvas/40 sm:px-5 xl:grid xl:grid-cols-[minmax(0,1.7fr)_120px_90px_120px_130px_150px] xl:items-center xl:gap-3 xl:py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={
                          expired
                            ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger"
                            : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                        }
                      >
                        {expired ? (
                          <TriangleAlert className="size-4" />
                        ) : (
                          <Layers className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/productos/${lot.product_id}`}
                          className="block truncate text-sm font-bold text-ink hover:text-brand"
                        >
                          {product?.name ?? "Producto"}
                        </Link>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {product?.sku ?? "—"} · Lote {lot.lot_code}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 xl:mt-0">
                      <span className="text-[11px] font-medium text-muted xl:hidden">
                        {formatDateOnly(lot.expires_on)}
                      </span>
                      {lot.expires_on ? (
                        <Badge
                          tone={
                            expired
                              ? "danger"
                              : days !== null &&
                                  days <= auth.settings.expiry_alert_days
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
                    </div>

                    <p className="mt-2 text-sm font-extrabold text-ink xl:mt-0 xl:text-right">
                      {formatNumber(lot.quantity)}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-muted xl:mt-0">
                      {formatMoney(lot.unit_cost)}
                    </p>

                    <p className="mt-1 text-[11px] text-muted xl:mt-0">
                      {formatDateTime(lot.received_at, timeZone)}
                    </p>

                    <div className="mt-3 flex justify-end xl:mt-0">
                      {canManage ? (
                        <LotActions
                          lot={{
                            id: lot.id,
                            productName: product?.name ?? "Producto",
                            lotCode: lot.lot_code,
                            quantity: lot.quantity,
                            expiresOn: lot.expires_on,
                          }}
                        />
                      ) : (
                        <span className="text-[11px] text-muted">Solo lectura</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

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
                          · Lote{" "}
                          {movementLotCodes.get(movement.lot_id) ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {movementLabel(movement.type)}
                        {movement.reason ? ` · ${movement.reason}` : ""} ·{" "}
                        {formatDateTime(movement.created_at, timeZone)}
                        {movementUserNames.get(movement.created_by)
                          ? ` · ${movementUserNames.get(movement.created_by)}`
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
    </div>
  );
}
