"use server";

import { revalidatePath } from "next/cache";
import { getActionAuth } from "@/lib/auth/context";
import {
  actionError,
  fieldErrorsFromZod,
  errorMessage,
} from "@/lib/validation";
import { saleSchema, voidSaleSchema } from "./schema";
import type { ActionResult, Json } from "@/types/database";

type SaleResult = {
  saleId: string;
  ticketNumber: number;
  total: number;
};

export async function createSaleAction(input: {
  items: { productId: string; quantity: number }[];
  paymentMethod: "cash" | "card" | "transfer";
}): Promise<ActionResult<SaleResult>> {
  const { auth, error } = await getActionAuth("sales.create");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = saleSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(
      "La venta contiene datos inválidos.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { data, error: rpcError } = await auth.supabase.rpc("create_sale", {
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })) as unknown as Json,
    p_payment_method: parsed.data.paymentMethod,
  });

  if (rpcError) {
    return actionError(errorMessage(rpcError));
  }

  const result = data as unknown as {
    sale_id: string;
    ticket_number: number;
    total: number;
  };

  revalidatePath("/");
  revalidatePath("/pos");
  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/productos");

  return {
    ok: true,
    data: {
      saleId: result.sale_id,
      ticketNumber: result.ticket_number,
      total: Number(result.total),
    },
  };
}

export async function voidSaleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("sales.void");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = voidSaleSchema.safeParse({
    saleId: formData.get("sale_id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos de la anulación.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: rpcError } = await auth.supabase.rpc("void_sale", {
    p_sale_id: parsed.data.saleId,
    p_reason: parsed.data.reason,
  });

  if (rpcError) return actionError(errorMessage(rpcError));

  revalidatePath("/");
  revalidatePath("/ventas");
  revalidatePath(`/ventas/${parsed.data.saleId}`);
  revalidatePath("/inventario");
  revalidatePath("/productos");

  return { ok: true, message: "Venta anulada y stock restituido." };
}
