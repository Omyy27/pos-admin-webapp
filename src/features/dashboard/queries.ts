import { addDaysToDateOnly, daysUntil, getDayRange, todayInBogota } from "@/lib/format";
import type { AuthContext } from "@/lib/auth/context";
import type {
  ProductLotRow,
  ProductWithStock,
  SaleItemRow,
  SaleRow,
} from "@/types/database";

export type DashboardLowStock = Pick<
  ProductWithStock,
  "id" | "name" | "sku" | "available_quantity" | "min_stock" | "nearest_expiry"
>;

export type DashboardDueLot = Pick<
  ProductLotRow,
  "id" | "product_id" | "lot_code" | "expires_on" | "quantity"
>;

export type DashboardOverview = {
  lowStock: DashboardLowStock[];
  activeProducts: number;
  lotsDue: DashboardDueLot[];
  dueProductNames: Map<string, string>;
  todaySales: SaleRow[];
  completedCount: number;
  voidedCount: number;
  revenue: number;
  averageTicket: number;
  unitsSold: number;
  topProducts: { name: string; quantity: number }[];
  topQuantity: number;
  expiringCount: number;
  expiredCount: number;
};

export async function getDashboardOverview(
  auth: AuthContext,
): Promise<DashboardOverview> {
  const { supabase, can, settings } = auth;
  const canSeeSales = can("sales.read_all") || can("sales.read_own");
  const canSeeInventory = can("inventory.read");
  const timeZone = settings.timezone || "America/Bogota";
  const today = todayInBogota(timeZone);
  const alertDate = addDaysToDateOnly(today, settings.expiry_alert_days);
  const { start, end } = getDayRange(new Date(), timeZone);

  const [lowStockResult, productCountResult, lotsDueResult] = await Promise.all([
    supabase
      .from("products_with_stock")
      .select("id, name, sku, available_quantity, min_stock, nearest_expiry")
      .eq("active", true)
      .eq("low_stock", true)
      .order("available_quantity", { ascending: true })
      .limit(6),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    canSeeInventory
      ? supabase
          .from("product_lots")
          .select("id, product_id, lot_code, expires_on, quantity")
          .gt("quantity", 0)
          .not("expires_on", "is", null)
          .lte("expires_on", alertDate)
          .order("expires_on", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const lowStock = (lowStockResult.data ?? []) as DashboardLowStock[];
  const activeProducts = productCountResult.count ?? 0;
  const lotsDue = (lotsDueResult.data ?? []) as DashboardDueLot[];

  let todaySales: SaleRow[] = [];
  let todayItems: SaleItemRow[] = [];

  if (canSeeSales) {
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    todaySales = sales ?? [];

    if (todaySales.length > 0) {
      const { data: items } = await supabase
        .from("sale_items")
        .select("*")
        .in(
          "sale_id",
          todaySales.map((sale) => sale.id),
        );
      todayItems = items ?? [];
    }
  }

  const completedSales = todaySales.filter((sale) => sale.status === "completed");
  const revenue = completedSales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );
  const averageTicket =
    completedSales.length > 0 ? revenue / completedSales.length : 0;

  const topProductsMap = new Map<string, { name: string; quantity: number }>();
  const completedIds = new Set(completedSales.map((sale) => sale.id));

  for (const item of todayItems) {
    if (!completedIds.has(item.sale_id)) continue;
    const current = topProductsMap.get(item.product_id) ?? {
      name: item.product_name,
      quantity: 0,
    };
    current.quantity += item.quantity;
    topProductsMap.set(item.product_id, current);
  }

  const topProducts = [...topProductsMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const dueProductIds = [...new Set(lotsDue.map((lot) => lot.product_id))];
  let dueProductNames = new Map<string, string>();

  if (dueProductIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", dueProductIds);
    dueProductNames = new Map(
      (products ?? []).map((product) => [product.id, product.name]),
    );
  }

  const expiringCount = lotsDue.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days >= 0;
  }).length;
  const expiredCount = lotsDue.filter((lot) => {
    if (!lot.expires_on) return false;
    const days = daysUntil(lot.expires_on);
    return days !== null && days < 0;
  }).length;

  return {
    lowStock,
    activeProducts,
    lotsDue,
    dueProductNames,
    todaySales,
    completedCount: completedSales.length,
    voidedCount: todaySales.length - completedSales.length,
    revenue,
    averageTicket,
    unitsSold: todayItems.reduce((sum, item) => sum + item.quantity, 0),
    topProducts,
    topQuantity: topProducts[0]?.quantity ?? 1,
    expiringCount,
    expiredCount,
  };
}
