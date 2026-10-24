import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/context";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  paymentLabel,
} from "@/lib/format";
import { buttonClasses } from "@/components/ui/button";
import { PrintButton } from "@/components/sales/print-button";
import type { SaleItemRow, SaleRow } from "@/types/database";

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

  const { data: saleData } = await auth.supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!saleData) notFound();

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

  const items = (itemsData ?? []) as SaleItemRow[];
  const settings = auth.settings;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="min-h-dvh bg-[#ecebe5] px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-5 flex max-w-[420px] items-center justify-between gap-3">
        <Link
          href={`/ventas/${sale.id}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto w-full max-w-[360px] bg-white px-6 py-7 shadow-[0_18px_50px_-30px_rgba(23,52,43,0.5)] print:max-w-[80mm] print:px-2 print:py-0 print:shadow-none">
        {sale.status === "voided" ? (
          <div className="mb-4 border-2 border-black px-3 py-2 text-center text-xs font-extrabold uppercase tracking-[0.2em]">
            Venta anulada
          </div>
        ) : null}

        <header className="border-b border-dashed border-neutral-400 pb-4 text-center">
          <h1 className="font-display text-2xl font-semibold leading-tight text-black">
            {settings.store_name}
          </h1>
          {settings.address ? (
            <p className="mt-1 text-[11px] leading-snug text-neutral-600">
              {settings.address}
            </p>
          ) : null}
          {settings.phone ? (
            <p className="mt-0.5 text-[11px] text-neutral-600">
              Tel. {settings.phone}
            </p>
          ) : null}
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            Ticket de venta
          </p>
          <p className="mt-1 text-lg font-extrabold text-black">
            #{sale.ticket_number}
          </p>
        </header>

        <section className="space-y-1 border-b border-dashed border-neutral-400 py-3 text-[11px] text-neutral-700">
          <div className="flex justify-between gap-3">
            <span>Fecha</span>
            <span className="text-right font-semibold text-black">
              {formatDateTime(sale.created_at, settings.timezone)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Atendido por</span>
            <span className="text-right font-semibold text-black">
              {seller?.full_name ?? "Usuario"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Pago</span>
            <span className="text-right font-semibold text-black">
              {paymentLabel(sale.payment_method)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Artículos</span>
            <span className="text-right font-semibold text-black">
              {formatNumber(totalItems)}
            </span>
          </div>
        </section>

        <section className="border-b border-dashed border-neutral-400 py-3">
          <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
            <span>Producto</span>
            <span>Total</span>
          </div>
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id}>
                <p className="text-[11px] font-bold leading-snug text-black">
                  {item.product_name}
                </p>
                <div className="mt-0.5 flex justify-between gap-3 text-[10px] text-neutral-600">
                  <span>
                    {formatNumber(item.quantity)} ×{" "}
                    {formatMoney(item.unit_price)}
                  </span>
                  <span className="font-semibold text-black">
                    {formatMoney(item.line_total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-dashed border-neutral-400 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.13em] text-neutral-600">
              Total
            </span>
            <span className="text-2xl font-extrabold tracking-[-0.02em] text-black">
              {formatMoney(sale.total)}
            </span>
          </div>
          {settings.prices_include_tax ? (
            <p className="mt-1 text-right text-[9px] text-neutral-500">
              Precio final con impuesto incluido
            </p>
          ) : null}
        </section>

        {sale.status === "voided" && sale.void_reason ? (
          <section className="border-b border-dashed border-neutral-400 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              Motivo de anulación
            </p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-700">
              {sale.void_reason}
            </p>
          </section>
        ) : null}

        <footer className="pt-4 text-center">
          <p className="text-[11px] leading-relaxed text-neutral-600">
            {settings.receipt_footer ?? "Gracias por su compra."}
          </p>
          <p className="mt-3 text-[9px] leading-relaxed text-neutral-400">
            Conserve este ticket para cambios o reclamos.
            <br />
            {settings.store_name} · {settings.currency_code}
          </p>
        </footer>
      </article>
    </main>
  );
}
