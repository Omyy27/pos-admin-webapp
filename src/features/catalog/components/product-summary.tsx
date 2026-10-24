import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { formatDateOnly, formatMoney, formatNumber } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import type { ProductWithStock } from "@/types/database";

export function ProductSummary({
  product,
  canEdit,
  inventoryAction,
}: {
  product: ProductWithStock;
  canEdit: boolean;
  inventoryAction?: ReactNode;
}) {
  return (
    <>
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
            {inventoryAction}
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
            {formatNumber(product.available_quantity)}
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
    </>
  );
}
