import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { requirePermission } from "@/lib/auth/context";
import { getDashboardOverview } from "@/features/dashboard/queries";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = {
  title: "Resumen",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await requirePermission("dashboard.view");
  const data = await getDashboardOverview(auth);
  const timeZone = auth.settings.timezone || "America/Bogota";

  const hour = Number(
    formatInTimeZone(new Date(), timeZone, "H", { locale: es }),
  );
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const todayLabel = formatInTimeZone(
    new Date(),
    timeZone,
    "EEEE, d 'de' MMMM",
    { locale: es },
  );

  return (
    <DashboardView
      data={data}
      profileName={auth.profile.full_name}
      storeName={auth.settings.store_name}
      roleName={auth.role.name}
      timeZone={timeZone}
      expiryAlertDays={auth.settings.expiry_alert_days}
      greeting={greeting}
      todayLabel={todayLabel}
      canSeeSales={auth.can("sales.read_all") || auth.can("sales.read_own")}
      canSeeInventory={auth.can("inventory.read")}
      canManageInventory={auth.can("inventory.manage")}
      canCreateSale={auth.can("sales.create")}
      canManageCatalog={auth.can("catalog.manage")}
    />
  );
}
