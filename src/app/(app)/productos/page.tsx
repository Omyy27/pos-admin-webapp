import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Layers,
  PackagePlus,
  PackageSearch,
  Search,
  Tag,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { formatDateOnly, formatMoney, formatNumber } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { CategoryRow, ProductWithStock } from "@/types/database";

export const metadata: Metadata = {
  title: "Productos",
};

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("catalog.read");
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const estado = typeof params.estado === "string" ? params.estado : "todos";
  const categoria =
    typeof params.categoria === "string" ? params.categoria : "";

  const { data: categories } = await auth.supabase
    .from("categories")
    .select("*")
    .order("name");

  let query = auth.supabase
    .from("products_with_stock")
    .select("*")
    .order("name", { ascending: true })
    .limit(250);

  if (q) {
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,sku.ilike.%${safe}%,barcode.ilike.%${safe}%`,
      );
    }
  }

  if (categoria && UUID_PATTERN.test(categoria)) {
    query = query.eq("category_id", categoria);
  }

  if (estado === "activos") query = query.eq("active", true);
  if (estado === "inactivos") query = query.eq("active", false);
  if (estado === "stock_bajo") {
    query = query.eq("active", true).eq("low_stock", true);
  }
  if (estado === "agotados") query = query.eq("available_quantity", 0);

  const { data: products, error } = await query;

  if (error) {
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }

  const rows = (products ?? []) as ProductWithStock[];
  const canManage = auth.can("catalog.manage");
  const hasFilters = Boolean(q || categoria || estado !== "todos");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Precios finales en COP, existencias por lote y alertas de reposición en un solo lugar."
        actions={
          <>
            <Link
              href="/productos/categorias"
              className={buttonClasses({ variant: "outline" })}
            >
              <Tag className="size-4" />
              Categorías
            </Link>
            {canManage ? (
              <Link
                href="/productos/nuevo"
                className={buttonClasses({ variant: "primary" })}
              >
                <PackagePlus className="size-4" />
                Nuevo producto
              </Link>
            ) : null}
          </>
        }
      />

      <Card className="p-4 sm:p-5">
        <form
          action="/productos"
          method="get"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(215px,0.7fr)_minmax(200px,0.6fr)_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/60" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre, SKU o código de barras…"
              className="pl-10"
              aria-label="Buscar productos"
            />
          </div>
          <Select
            name="categoria"
            defaultValue={categoria}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {(categories ?? []).map((category: CategoryRow) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="stock_bajo">Stock bajo</option>
            <option value="agotados">Agotados</option>
          </Select>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit" className="flex-1 md:flex-none">
              <Search className="size-4" />
              Buscar
            </Button>
            {hasFilters ? (
              <Link
                href="/productos"
                className={buttonClasses({ variant: "ghost", size: "md" })}
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-semibold text-muted">
          {formatNumber(rows.length)} producto{rows.length === 1 ? "" : "s"}{" "}
          {hasFilters ? "con los filtros aplicados" : "en el catálogo"}
        </p>
        <Link
          href="/inventario"
          className="text-xs font-bold text-brand hover:text-brand-deep"
        >
          Ver inventario
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="size-5" />}
          title={hasFilters ? "No encontramos productos" : "Tu catálogo está vacío"}
          description={
            hasFilters
              ? "Prueba con otros términos de búsqueda o limpia los filtros para ver todo el catálogo."
              : "Crea el primer producto para empezar a registrar entradas de inventario y vender desde el mostrador."
          }
          action={
            canManage ? (
              <Link href="/productos/nuevo" className={buttonClasses({ size: "sm" })}>
                <PackagePlus className="size-4" />
                Crear producto
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(100px,0.7fr)_130px_110px_130px_120px_28px] gap-3 border-b border-line bg-canvas/60 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted xl:grid">
            <span>Producto</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span className="text-right">Disponible</span>
            <span>Próximo vencimiento</span>
            <span>Estado</span>
            <span />
          </div>

          <div className="divide-y divide-line/80">
            {rows.map((product) => (
              <Link
                key={product.id}
                href={`/productos/${product.id}`}
                className="group block px-4 py-4 transition hover:bg-canvas/60 sm:px-5 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(100px,0.7fr)_130px_110px_130px_120px_28px] xl:items-center xl:gap-3 xl:py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Layers className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                      {product.sku}
                      {product.barcode ? ` · ${product.barcode}` : ""}
                    </p>
                  </div>
                </div>

                <p className="mt-2 truncate text-xs text-muted xl:mt-0">
                  {product.category_name ?? "Sin categoría"}
                </p>

                <p className="mt-2 text-sm font-extrabold text-ink xl:mt-0">
                  {formatMoney(product.sale_price)}
                </p>

                <div className="mt-2 flex items-center gap-2 xl:mt-0 xl:justify-end">
                  <span
                    className={
                      product.available_quantity > product.min_stock
                        ? "text-sm font-bold text-ink"
                        : "text-sm font-bold text-[#8a5a16]"
                    }
                  >
                    {formatNumber(product.available_quantity)}
                  </span>
                  <span className="text-[11px] text-muted">
                    / mín. {formatNumber(product.min_stock)}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted xl:mt-0">
                  <CalendarClock className="size-3.5 shrink-0" />
                  {formatDateOnly(product.nearest_expiry)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 xl:mt-0">
                  {product.expired_quantity > 0 ? (
                    <Badge tone="danger">
                      {formatNumber(product.expired_quantity)} vencidos
                    </Badge>
                  ) : null}
                  {product.active ? (
                    product.low_stock ? (
                      <Badge tone="warning">Stock bajo</Badge>
                    ) : (
                      <Badge tone="success">Activo</Badge>
                    )
                  ) : (
                    <Badge tone="neutral">Inactivo</Badge>
                  )}
                </div>

                <ArrowRight className="hidden size-4 text-muted/30 transition group-hover:text-brand xl:block" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
