import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import {
  PosTerminal,
  type PosProduct,
} from "@/components/pos/pos-terminal";

export const metadata: Metadata = {
  title: "Punto de venta",
};

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const auth = await requirePermission("sales.create");

  const { data, error } = await auth.supabase
    .from("products_with_stock")
    .select(
      "id, name, sku, barcode, category_name, sale_price, available_quantity, track_lots",
    )
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(`No se pudo cargar el punto de venta: ${error.message}`);
  }

  const products = (data ?? []) as PosProduct[];
  const categories = [
    ...new Set(
      products
        .map((product) => product.category_name)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

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
