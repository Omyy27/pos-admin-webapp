import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/card";
import { CategoryManager } from "@/features/catalog/components/category-manager";
import { listCategories } from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "Categorías",
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const auth = await requirePermission("catalog.read");
  const categories = await listCategories(auth);

  return (
    <div className="space-y-5">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Volver al catálogo
      </Link>

      <PageHeader
        eyebrow="Catálogo"
        title="Categorías"
        description="Agrupa los productos para encontrarlos más rápido en el mostrador y en los reportes."
      />

      <CategoryManager
        categories={categories}
        canManage={auth.can("catalog.manage")}
      />
    </div>
  );
}
