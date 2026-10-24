import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/features/catalog/components/product-form";
import { getProduct, listCategories } from "@/features/catalog/queries";

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

  const [product, categories] = await Promise.all([
    getProduct(auth, id),
    listCategories(auth),
  ]);

  if (!product) notFound();

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

      <ProductForm categories={categories} product={product} />
    </div>
  );
}
