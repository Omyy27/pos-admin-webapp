import { getPeriodRange } from "@/lib/format";
import type { AuthContext } from "@/lib/auth/context";
import type { ProductLotRow, SaleItemRow, SaleRow } from "@/types/database";

export const SALES_PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo el historial" },
] as const;

export type SalesPeriod = (typeof SALES_PERIODS)[number]["value"];

export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  sale_price: number;
  available_quantity: number;
  track_lots: boolean;
};

export type SalesFilters = {
  q: string;
  estado: "" | "completed" | "voided";
  pago: "" | "cash" | "card" | "transfer";
  periodo: SalesPeriod;
};

export type SalesTotals = {
  completed_count: number;
  voided_count: number;
  revenue: number;
};

export type SalesHistory = {
  sales: SaleRow[];
  itemsBySale: Map<string, { count: number; units: number }>;
  sellerNames: Map<string, string>;
  totals: SalesTotals;
};

export type LotUsage = {
  lotId: string;
  lotCode: string;
  expiresOn: string | null;
  quantity: number;
  unitCost: number;
};

export type SaleDetail = {
  sale: SaleRow;
  items: SaleItemRow[];
  lotsByItem: Map<string, LotUsage[]>;
  totalCost: number;
  profileNames: Map<string, string>;
  canSeeCosts: boolean;
};

export type SaleTicket = {
  sale: SaleRow;
  items: SaleItemRow[];
  sellerName: string | null;
};

export function parseSalesFilters(
  params: Record<string, string | string[] | undefined>,
): SalesFilters {
  return {
    q: typeof params.q === "string" ? params.q.trim() : "",
    estado:
      typeof params.estado === "string" &&
      ["completed", "voided"].includes(params.estado)
        ? (params.estado as SalesFilters["estado"])
        : "",
    pago:
      typeof params.pago === "string" &&
      ["cash", "card", "transfer"].includes(params.pago)
        ? (params.pago as SalesFilters["pago"])
        : "",
    periodo:
      typeof params.periodo === "string" &&
      SALES_PERIODS.some((item) => item.value === params.periodo)
        ? (params.periodo as SalesPeriod)
        : "month",
  };
}

export async function getSalesHistory(
  auth: AuthContext,
  filters: SalesFilters,
): Promise<SalesHistory> {
  const { q, estado, pago, periodo } = filters;
  const range = getPeriodRange(periodo, auth.settings.timezone);
  const ticketQuery = q.replace(/^#/, "");

  let query = auth.supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (range.start) {
    query = query.gte("created_at", range.start).lte("created_at", range.end);
  } else {
    query = query.lte("created_at", range.end);
  }

  if (estado) query = query.eq("status", estado);
  if (pago) query = query.eq("payment_method", pago);
  if (ticketQuery && /^\d+$/.test(ticketQuery)) {
    query = query.eq("ticket_number", Number(ticketQuery));
  }

  const totalsQuery = auth.supabase.rpc("sales_totals", {
    p_start: range.start,
    p_end: range.end,
    p_status: estado || null,
    p_payment_method: pago || null,
    p_ticket_number:
      ticketQuery && /^\d+$/.test(ticketQuery) ? Number(ticketQuery) : null,
  });

  const [
    { data: salesData, error },
    { data: totalsData, error: totalsError },
  ] = await Promise.all([query, totalsQuery]);

  if (error) {
    throw new Error(`No se pudieron cargar las ventas: ${error.message}`);
  }

  if (totalsError) {
    throw new Error(`No se pudieron calcular los totales: ${totalsError.message}`);
  }

  const totals = (totalsData ?? {
    completed_count: 0,
    voided_count: 0,
    revenue: 0,
  }) as SalesTotals;

  const sales = (salesData ?? []) as SaleRow[];
  const saleIds = sales.map((sale) => sale.id);

  let items: Pick<SaleItemRow, "sale_id" | "quantity">[] = [];
  let sellerNames = new Map<string, string>();

  if (saleIds.length > 0) {
    const sellerIds = [...new Set(sales.map((sale) => sale.created_by))];
    const [itemsResult, profilesResult] = await Promise.all([
      auth.supabase
        .from("sale_items")
        .select("sale_id, quantity")
        .in("sale_id", saleIds),
      auth.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", sellerIds),
    ]);

    items = itemsResult.data ?? [];
    sellerNames = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.full_name,
      ]),
    );
  }

  const itemsBySale = new Map<string, { count: number; units: number }>();
  for (const item of items) {
    const current = itemsBySale.get(item.sale_id) ?? { count: 0, units: 0 };
    current.count += 1;
    current.units += item.quantity;
    itemsBySale.set(item.sale_id, current);
  }

  return { sales, itemsBySale, sellerNames, totals };
}

type SaleItemLotUsage = {
  sale_item_id: string;
  lot_id: string;
  quantity: number;
  unit_cost: number;
  product_lots: Pick<ProductLotRow, "lot_code" | "expires_on"> | null;
};

type SaleItemWithLots = SaleItemRow & {
  sale_item_lots: SaleItemLotUsage[] | null;
};

type SaleWithItems = SaleRow & {
  sale_items: SaleItemWithLots[] | null;
};

export async function getSaleDetail(
  auth: AuthContext,
  id: string,
): Promise<SaleDetail | null> {
  const canSeeCosts = auth.can("sales.read_all") && auth.can("inventory.read");

  // Venta, ítems y —solo si el usuario puede ver costos— lotes usados y sus
  // datos, en un único viaje. Los tipos generados no declaran las relaciones
  // embebidas; el cast refleja la forma que devuelve PostgREST.
  const { data: saleData } = await auth.supabase
    .from("sales")
    .select(
      canSeeCosts
        ? "*, sale_items(*, sale_item_lots(sale_item_id, lot_id, quantity, unit_cost, product_lots(lot_code, expires_on)))"
        : "*, sale_items(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!saleData) return null;

  const { sale_items: saleItems, ...sale } = saleData as unknown as SaleWithItems;
  const items = (saleItems ?? []) as SaleItemWithLots[];

  items.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const lotsByItem = new Map<string, LotUsage[]>();
  let totalCost = 0;

  if (canSeeCosts) {
    for (const item of items) {
      for (const usage of item.sale_item_lots ?? []) {
        const list = lotsByItem.get(item.id) ?? [];
        list.push({
          lotId: usage.lot_id,
          lotCode: usage.product_lots?.lot_code ?? "—",
          expiresOn: usage.product_lots?.expires_on ?? null,
          quantity: usage.quantity,
          unitCost: Number(usage.unit_cost),
        });
        lotsByItem.set(item.id, list);
        totalCost += usage.quantity * Number(usage.unit_cost);
      }
    }
  }

  // Segunda y última consulta: nombres de quien creó y anuló la venta.
  const userIds = [sale.created_by, sale.voided_by].filter(
    (value): value is string => Boolean(value),
  );

  let profileRows: { id: string; full_name: string }[] = [];

  if (userIds.length > 0) {
    const { data } = await auth.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profileRows = data ?? [];
  }

  const profileNames = new Map(
    profileRows.map((profile) => [profile.id, profile.full_name]),
  );

  return {
    sale,
    items,
    lotsByItem,
    totalCost,
    profileNames,
    canSeeCosts,
  };
}

export async function getPosCatalog(auth: AuthContext): Promise<{
  products: PosProduct[];
  categories: string[];
}> {
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

  return { products, categories };
}

export async function getSaleTicket(
  auth: AuthContext,
  id: string,
): Promise<SaleTicket | null> {
  const { data: saleData } = await auth.supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!saleData) return null;

  const sale = saleData as SaleRow;

  const [{ data: itemsData }, { data: seller }] = await Promise.all([
    auth.supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id)
      .order("created_at", { ascending: true }),
    auth.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sale.created_by)
      .maybeSingle(),
  ]);

  return {
    sale,
    items: (itemsData ?? []) as SaleItemRow[],
    sellerName: seller?.full_name ?? null,
  };
}
