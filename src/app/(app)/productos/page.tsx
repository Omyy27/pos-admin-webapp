import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import {
  hasProductFilters,
  listCategories,
  listProducts,
  parseProductFilters,
} from "@/features/catalog/queries";
import { ProductsView } from "@/features/catalog/components/products-view";

export const metadata: Metadata = {
  title: "Productos",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("catalog.read");
  const filters = parseProductFilters(await searchParams);

  const [products, categories] = await Promise.all([
    listProducts(auth, filters),
    listCategories(auth),
  ]);

  return (
    <ProductsView
      products={products}
      categories={categories}
      filters={filters}
      hasFilters={hasProductFilters(filters)}
      canManage={auth.can("catalog.manage")}
    />
  );
}
