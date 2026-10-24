import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import {
  getInventoryOverview,
  parseInventoryFilters,
} from "@/features/inventory/queries";
import { InventoryView } from "@/features/inventory/components/inventory-view";

export const metadata: Metadata = {
  title: "Inventario",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requirePermission("inventory.read");
  const filters = parseInventoryFilters(await searchParams);
  const data = await getInventoryOverview(auth, filters);

  return (
    <InventoryView
      data={data}
      filters={filters}
      canManage={auth.can("inventory.manage")}
      expiryAlertDays={auth.settings.expiry_alert_days}
      timeZone={auth.settings.timezone}
    />
  );
}
