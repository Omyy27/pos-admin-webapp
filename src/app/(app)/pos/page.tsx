import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import { getPosCatalog } from "@/features/sales/queries";
import { PosTerminal } from "@/features/sales/components/pos-terminal";

export const metadata: Metadata = {
  title: "Punto de venta",
};

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const auth = await requirePermission("sales.create");
  const { products, categories } = await getPosCatalog(auth);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Caja"
        title="Punto de venta"
        description="Busca por nombre, SKU o escanea el código de barras. El sistema descuenta automáticamente los lotes con vencimiento más próximo."
      />

      <PosTerminal
        products={products}
        categories={categories}
        pricesIncludeTax={auth.settings.prices_include_tax}
      />
    </div>
  );
}
