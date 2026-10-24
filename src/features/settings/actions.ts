"use server";

import { revalidatePath } from "next/cache";
import { getActionAuth } from "@/lib/auth/context";
import {
  actionError,
  actionOk,
  fieldErrorsFromZod,
} from "@/lib/validation";
import { settingsSchema } from "./schema";
import type { ActionResult } from "@/types/database";

export async function updateSettingsAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("settings.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = settingsSchema.safeParse({
    storeName: formData.get("store_name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    expiryAlertDays: formData.get("expiry_alert_days"),
    receiptFooter: formData.get("receipt_footer"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa la configuración.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: updateError } = await auth.supabase
    .from("settings")
    .update({
      store_name: parsed.data.storeName,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      expiry_alert_days: parsed.data.expiryAlertDays,
      receipt_footer: parsed.data.receiptFooter ?? null,
      updated_by: auth.user.id,
    })
    .eq("id", 1);

  if (updateError) return actionError(updateError.message);

  revalidatePath("/", "layout");
  revalidatePath("/configuracion");
  return actionOk("Configuración guardada.");
}
