"use server";

import { revalidatePath } from "next/cache";
import { getActionAuth } from "@/lib/auth/context";
import {
  actionError,
  actionOk,
  errorMessage,
  fieldErrorsFromZod,
} from "@/lib/validation";
import {
  adjustLotSchema,
  receiveLotSchema,
  writeOffSchema,
} from "./schema";
import type { ActionResult } from "@/types/database";

function inventoryMessage(error: { message: string }): string {
  return errorMessage(error);
}

export async function receiveLotAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("inventory.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = receiveLotSchema.safeParse({
    productId: formData.get("product_id"),
    lotCode: formData.get("lot_code"),
    expiresOn: formData.get("expires_on"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unit_cost"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos de la entrada.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: rpcError } = await auth.supabase.rpc("receive_lot", {
    p_product_id: parsed.data.productId,
    p_lot_code: parsed.data.lotCode,
    p_expires_on: parsed.data.expiresOn ?? null,
    p_quantity: parsed.data.quantity,
    p_unit_cost: parsed.data.unitCost,
    p_note: parsed.data.note ?? null,
  });

  if (rpcError) return actionError(inventoryMessage(rpcError));

  revalidatePath("/inventario");
  revalidatePath("/productos");
  revalidatePath(`/productos/${parsed.data.productId}`);
  revalidatePath("/pos");
  revalidatePath("/");
  return actionOk("Entrada registrada correctamente.");
}

export async function adjustLotAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("inventory.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = adjustLotSchema.safeParse({
    lotId: formData.get("lot_id"),
    newQuantity: formData.get("new_quantity"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos del ajuste.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: rpcError } = await auth.supabase.rpc("adjust_lot", {
    p_lot_id: parsed.data.lotId,
    p_new_quantity: parsed.data.newQuantity,
    p_reason: parsed.data.reason,
  });

  if (rpcError) return actionError(inventoryMessage(rpcError));

  revalidatePath("/inventario");
  revalidatePath("/productos");
  revalidatePath("/");
  return actionOk("Ajuste registrado.");
}

export async function writeOffLotAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("inventory.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = writeOffSchema.safeParse({
    lotId: formData.get("lot_id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos de la baja.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: rpcError } = await auth.supabase.rpc("write_off_lot", {
    p_lot_id: parsed.data.lotId,
    p_reason: parsed.data.reason,
  });

  if (rpcError) return actionError(inventoryMessage(rpcError));

  revalidatePath("/inventario");
  revalidatePath("/productos");
  revalidatePath("/");
  return actionOk("Lote dado de baja.");
}
