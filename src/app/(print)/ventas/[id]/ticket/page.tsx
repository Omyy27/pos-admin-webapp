import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/context";
import { getSaleTicket } from "@/features/sales/queries";
import { TicketView } from "@/features/sales/components/ticket-view";

export const metadata: Metadata = {
  title: "Ticket de venta",
};

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireAuthContext();

  if (!auth.can("sales.read_all") && !auth.can("sales.read_own")) {
    redirect("/sin-permiso");
  }

  const ticket = await getSaleTicket(auth, id);

  if (!ticket) notFound();

  return <TicketView ticket={ticket} settings={auth.settings} />;
}
