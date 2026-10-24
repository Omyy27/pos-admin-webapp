import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/catalog/product-form";
import type { CategoryRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Nuevo producto",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const auth = await requirePermission("catalog.manage");

  const { data: categories } = await auth.supabase
    .from("categories")
    .select("*")
    .order("name");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Volver al catálogo
      </Link>

      <PageHeader
        eyebrow="Catálogo"
        title="Nuevo producto"
        description="Las existencias se cargan después mediante entradas por lote. Aquí solo defines la identidad, el precio y las reglas de control."
      />

      <ProductForm categories={(categories ?? []) as CategoryRow[]} />
    </div>
  );
}
