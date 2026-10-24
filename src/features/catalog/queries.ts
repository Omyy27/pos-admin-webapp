import type { AuthContext } from "@/lib/auth/context";
import type { CategoryRow, ProductWithStock } from "@/types/database";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProductFilters = {
  q: string;
  estado: string;
  categoria: string;
};

export function parseProductFilters(
  params: Record<string, string | string[] | undefined>,
): ProductFilters {
  return {
    q: typeof params.q === "string" ? params.q.trim() : "",
    estado: typeof params.estado === "string" ? params.estado : "todos",
    categoria: typeof params.categoria === "string" ? params.categoria : "",
  };
}

export function hasProductFilters(filters: ProductFilters): boolean {
  return Boolean(
    filters.q || filters.categoria || filters.estado !== "todos",
  );
}

export async function listCategories(
  auth: AuthContext,
): Promise<CategoryRow[]> {
  const { data } = await auth.supabase
    .from("categories")
    .select("*")
    .order("name");

  return (data ?? []) as CategoryRow[];
}

export async function listProducts(
  auth: AuthContext,
  filters: ProductFilters,
): Promise<ProductWithStock[]> {
  const { q, estado, categoria } = filters;

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

  const { data, error } = await query;

  if (error) {
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }

  return (data ?? []) as ProductWithStock[];
}

export async function getProduct(
  auth: AuthContext,
  id: string,
): Promise<ProductWithStock | null> {
  const { data } = await auth.supabase
    .from("products_with_stock")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as ProductWithStock | null) ?? null;
}
