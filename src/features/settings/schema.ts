import { z } from "zod";
import { optionalText, requiredNumber } from "@/lib/validation";

export const settingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2, "El nombre de la tienda es obligatorio.")
    .max(120, "El nombre es demasiado largo."),
  address: optionalText,
  phone: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(40).nullable(),
    )
    .optional(),
  expiryAlertDays: requiredNumber(
    z
      .number({ error: "Ingresa un número de días." })
      .int("Debe ser un número entero.")
      .min(1, "Debe ser al menos 1 día.")
      .max(365, "No puede superar 365 días."),
  ),
  receiptFooter: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(300).nullable(),
    )
    .optional(),
});
