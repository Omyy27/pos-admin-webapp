import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/catalog/product-form";
import type { CategoryRow, ProductWithStock } from "@/types/database";

export const metadata: Metadata = {
  title: "Editar producto",
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requirePermission("catalog.manage");

  const [productResult, categoriesResult] = await Promise.all([
    auth.supabase.from("products_with_stock").select("*").eq("id", id).maybeSingle(),
    auth.supabase.from("categories").select("*").order("name"),
  ]);

  if (!productResult.data) notFound();

  const product = productResult.data as ProductWithStock;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href={`/productos/${product.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Volver al producto
      </Link>

      <PageHeader
        eyebrow="Catálogo"
        title={`Editar ${product.name}`}
        description="Los cambios de precio aplican a las próximas ventas. El stock no se modifica desde este formulario."
      />

      <ProductForm
        categories={(categoriesResult.data ?? []) as CategoryRow[]}
        product={product}
      />
    </div>
  );
}
