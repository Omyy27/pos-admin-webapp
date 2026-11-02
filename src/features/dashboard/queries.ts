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

type TodaySaleItem = Pick<
  SaleItemRow,
  "sale_id" | "product_id" | "product_name" | "quantity"
>;

type SaleWithItems = SaleRow & {
  sale_items: TodaySaleItem[] | null;
};

type DueLot = DashboardDueLot & {
  products: { name: string } | null;
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

  // Todas las consultas independientes salen en una sola tanda. Antes las
  // ventas, sus ítems y los nombres de productos eran viajes secuenciales.
  const salesPromise = canSeeSales
    ? supabase
        .from("sales")
        .select("*, sale_items(sale_id, product_id, product_name, quantity)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [] as SaleWithItems[], error: null });

  const [lowStockResult, productCountResult, lotsDueResult, salesResult] =
    await Promise.all([
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
            .select(
              "id, product_id, lot_code, expires_on, quantity, products(name)",
            )
            .gt("quantity", 0)
            .not("expires_on", "is", null)
            .lte("expires_on", alertDate)
            .order("expires_on", { ascending: true })
            .limit(8)
        : Promise.resolve({ data: [] as DueLot[], error: null }),
      salesPromise,
    ]);

  const lowStock = (lowStockResult.data ?? []) as DashboardLowStock[];
  const activeProducts = productCountResult.count ?? 0;
  // Los tipos generados no declaran las relaciones embebidas; los casts
  // reflejan la forma que devuelve PostgREST para estos selects.
  const dueLotRows = (lotsDueResult.data ?? []) as unknown as DueLot[];
  const lotsDue: DashboardDueLot[] = dueLotRows.map((lot) => ({
    id: lot.id,
    product_id: lot.product_id,
    lot_code: lot.lot_code,
    expires_on: lot.expires_on,
    quantity: lot.quantity,
  }));

  const saleRows = (salesResult.data ?? []) as unknown as SaleWithItems[];
  const todaySales: SaleRow[] = [];
  const todayItems: TodaySaleItem[] = [];

  for (const row of saleRows) {
    const { sale_items: saleItems, ...sale } = row;
    todaySales.push(sale);
    if (saleItems) todayItems.push(...saleItems);
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

  const dueProductNames = new Map<string, string>();
  for (const lot of dueLotRows) {
    if (lot.products?.name) {
      dueProductNames.set(lot.product_id, lot.products.name);
    }
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
