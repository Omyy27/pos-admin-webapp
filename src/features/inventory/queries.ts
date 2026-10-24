import { daysUntil } from "@/lib/format";
import type { AuthContext } from "@/lib/auth/context";
import type {
  CategoryRow,
  InventoryMovementRow,
  ProductLotRow,
  ProductRow,
  ProductWithStock,
} from "@/types/database";

export const INVENTORY_FILTERS = [
  { value: "todos", label: "Todos los lotes" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencidos", label: "Vencidos" },
  { value: "sin_caducidad", label: "Sin caducidad" },
  { value: "stock_bajo", label: "Productos con stock bajo" },
] as const;

export type InventoryFilter = (typeof INVENTORY_FILTERS)[number]["value"];

export type InventoryFilters = {
  q: string;
  categoria: string;
  producto: string;
  filtro: InventoryFilter;
};

export type InventoryProduct = Pick<
  ProductRow,
  "id" | "name" | "sku" | "track_lots" | "active" | "category_id"
>;

export type ProductInventory = {
  lots: ProductLotRow[];
  movements: InventoryMovementRow[];
  userNames: Map<string, string>;
};

export type InventoryOverview = {
  products: InventoryProduct[];
  categories: CategoryRow[];
  allLots: ProductLotRow[];
  lowStock: ProductWithStock[];
  movements: InventoryMovementRow[];
  productsById: Map<string, InventoryProduct>;
  movementLotCodes: Map<string, string>;
  movementUserNames: Map<string, string>;
  visibleLots: ProductLotRow[];
  totalUnits: number;
  expiringCount: number;
  expiredCount: number;
  expiredUnits: number;
  activeProducts: InventoryProduct[];
  selectedProduct: InventoryProduct | undefined;
};

export function parseInventoryFilters(
  params: Record<string, string | string[] | undefined>,
): InventoryFilters {
  return {
    q: typeof params.q === "string" ? params.q.trim() : "",
    categoria: typeof params.categoria === "string" ? params.categoria : "",
    producto: typeof params.producto === "string" ? params.producto : "",
    filtro:
      typeof params.filtro === "string" &&
      INVENTORY_FILTERS.some((item) => item.value === params.filtro)
        ? (params.filtro as InventoryFilter)
        : "todos",
  };
}

export async function getInventoryOverview(
  auth: AuthContext,
  filters: InventoryFilters,
): Promise<InventoryOverview> {
  const { q, categoria, producto, filtro } = filters;

  const [
    productsResult,
    categoriesResult,
    lotsResult,
    lowStockResult,
    movementsResult,
  ] = await Promise.all([
    auth.supabase
      .from("products")
      .select("id, name, sku, track_lots, active, category_id")
      .order("name"),
    auth.supabase.from("categories").select("*").order("name"),
    auth.supabase
      .from("product_lots")
      .select("*")
      .gt("quantity", 0)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .limit(1000),
    auth.supabase
      .from("products_with_stock")
      .select("*")
      .eq("active", true)
      .eq("low_stock", true)
      .order("available_quantity", { ascending: true })
      .limit(30),
    auth.supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const products = (productsResult.data ?? []) as InventoryProduct[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const allLots = (lotsResult.data ?? []) as ProductLotRow[];
  const lowStock = (lowStockResult.data ?? []) as ProductWithStock[];
  const movements = (movementsResult.data ?? []) as InventoryMovementRow[];

  const productsById = new Map(products.map((product) => [product.id, product]));
  const lowStockIds = new Set(lowStock.map((product) => product.id));

  const visibleLots = allLots.filter((lot) => {
    const product = productsById.get(lot.product_id);
    if (!product) return false;
    if (producto && lot.product_id !== producto) return false;
    if (categoria && product.category_id !== categoria) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !product.name.toLowerCase().includes(needle) &&
        !product.sku.toLowerCase().includes(needle) &&
        !lot.lot_code.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    if (filtro === "por_vencer") {
      if (!lot.expires_on) return false;
      const days = daysUntil(lot.expires_on);
      if (days === null || days < 0 || days > auth.settings.expiry_alert_days) {
        return false;
      }
    }
    if (filtro === "vencidos") {
      if (!lot.expires_on || daysUntil(lot.expires_on)! >= 0) return false;
    }
    if (filtro === "sin_caducidad" && lot.expires_on) return false;
    if (filtro === "stock_bajo" && !lowStockIds.has(lot.product_id)) return false;
    return true;
  });

  const totalUnits = allLots.reduce((sum, lot) => sum + lot.quantity, 0);
  const expiringLots = allLots.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days >= 0 && days <= auth.settings.expiry_alert_days;
  });
  const expiredLots = allLots.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days < 0;
  });

  let movementLotCodes = new Map<string, string>();
  let movementUserNames = new Map<string, string>();

  if (movements.length > 0) {
    const lotIds = [...new Set(movements.map((movement) => movement.lot_id))];
    const userIds = [...new Set(movements.map((movement) => movement.created_by))];

    const [lotsForMovements, profiles] = await Promise.all([
      auth.supabase.from("product_lots").select("id, lot_code").in("id", lotIds),
      auth.supabase.from("profiles").select("id, full_name").in("id", userIds),
    ]);

    movementLotCodes = new Map(
      (lotsForMovements.data ?? []).map((lot) => [lot.id, lot.lot_code]),
    );
    movementUserNames = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile.full_name]),
    );
  }

  return {
    products,
    categories,
    allLots,
    lowStock,
    movements,
    productsById,
    movementLotCodes,
    movementUserNames,
    visibleLots,
    totalUnits,
    expiringCount: expiringLots.length,
    expiredCount: expiredLots.length,
    expiredUnits: expiredLots.reduce((sum, lot) => sum + lot.quantity, 0),
    activeProducts: products.filter((product) => product.active),
    selectedProduct: producto ? productsById.get(producto) : undefined,
  };
}

export async function getProductInventory(
  auth: AuthContext,
  productId: string,
): Promise<ProductInventory> {
  if (!auth.can("inventory.read")) {
    return {
      lots: [],
      movements: [],
      userNames: new Map(),
    };
  }

  const [lotsResult, movementsResult] = await Promise.all([
    auth.supabase
      .from("product_lots")
      .select("*")
      .eq("product_id", productId)
      .order("expires_on", { ascending: true, nullsFirst: false }),
    auth.supabase
      .from("inventory_movements")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const lots = (lotsResult.data ?? []) as ProductLotRow[];
  const movements = (movementsResult.data ?? []) as InventoryMovementRow[];
  const userIds = [...new Set(movements.map((movement) => movement.created_by))];
  let userNames = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await auth.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    userNames = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );
  }

  return { lots, movements, userNames };
}
