import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/context";
import { getSaleDetail } from "@/features/sales/queries";
import { SaleDetailView } from "@/features/sales/components/sale-detail-view";

export const metadata: Metadata = {
  title: "Detalle de venta",
};

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireAuthContext();

  if (!auth.can("sales.read_all") && !auth.can("sales.read_own")) {
    redirect("/sin-permiso");
  }

  const detail = await getSaleDetail(auth, id);

  if (!detail) notFound();

  return (
    <SaleDetailView
      detail={detail}
      canVoid={auth.can("sales.void")}
      timeZone={auth.settings.timezone}
      pricesIncludeTax={auth.settings.prices_include_tax}
    />
  );
}
