import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/context";
import {
  getSalesHistory,
  parseSalesFilters,
} from "@/features/sales/queries";
import { SalesHistoryView } from "@/features/sales/components/sales-history-view";

export const metadata: Metadata = {
  title: "Ventas",
};

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAuthContext();
  const canSeeSales =
    auth.can("sales.read_all") || auth.can("sales.read_own");

  if (!canSeeSales) redirect("/sin-permiso");

  const filters = parseSalesFilters(await searchParams);
  const history = await getSalesHistory(auth, filters);

  return (
    <SalesHistoryView
      history={history}
      filters={filters}
      canSeeAll={auth.can("sales.read_all")}
      canCreate={auth.can("sales.create")}
      timeZone={auth.settings.timezone}
    />
  );
}
