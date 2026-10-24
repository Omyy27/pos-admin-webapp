import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, PackagePlus } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { getProduct } from "@/features/catalog/queries";
import { ProductSummary } from "@/features/catalog/components/product-summary";
import { getProductInventory } from "@/features/inventory/queries";
import { ProductLotsCard } from "@/features/inventory/components/product-lots-card";
import { ProductMovementsCard } from "@/features/inventory/components/product-movements-card";
import { ReceiveLotDialog } from "@/features/inventory/components/receive-lot-dialog";

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
  const product = await getProduct(auth, id);

  if (!product) notFound();

  const canSeeInventory = auth.can("inventory.read");
  const canManageInventory = auth.can("inventory.manage");
  const canEdit = auth.can("catalog.manage");
  const inventory = await getProductInventory(auth, product.id);
  const availableLots = inventory.lots.filter((lot) => lot.quantity > 0);

  return (
    <div className="space-y-5">
      <ProductSummary
        product={product}
        canEdit={canEdit}
        inventoryAction={
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
            />
          ) : null
        }
      />

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
          <ProductLotsCard
            product={product}
            lots={availableLots}
            canManage={canManageInventory}
          />
          <ProductMovementsCard
            movements={inventory.movements}
            userNames={inventory.userNames}
            timeZone={auth.settings.timezone}
          />
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
