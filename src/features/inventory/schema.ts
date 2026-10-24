import { z } from "zod";
import { optionalText, requiredNumber } from "@/lib/validation";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida.");

export const receiveLotSchema = z.object({
  productId: z.string().uuid("Producto inválido."),
  lotCode: z
    .string()
    .trim()
    .max(80, "El lote es demasiado largo.")
    .optional()
    .transform((value) => value ?? ""),
  expiresOn: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      dateOnly.nullable(),
    )
    .optional(),
  quantity: requiredNumber(
    z
      .number({ error: "Ingresa una cantidad." })
      .int("La cantidad debe ser entera.")
      .positive("La cantidad debe ser mayor que cero.")
      .max(999999, "La cantidad es demasiado alta."),
  ),
  unitCost: requiredNumber(
    z
      .number({ error: "Ingresa el costo." })
      .nonnegative("El costo no puede ser negativo.")
      .max(999999999, "El costo es demasiado alto."),
  ),
  note: optionalText,
});

export const adjustLotSchema = z.object({
  lotId: z.string().uuid("Lote inválido."),
  newQuantity: requiredNumber(
    z
      .number({ error: "Ingresa la cantidad final." })
      .int("La cantidad debe ser entera.")
      .min(0, "La cantidad no puede ser negativa.")
      .max(999999, "La cantidad es demasiado alta."),
  ),
  reason: z
    .string()
    .trim()
    .min(3, "Explica el motivo del ajuste.")
    .max(300, "El motivo es demasiado largo."),
});

export const writeOffSchema = z.object({
  lotId: z.string().uuid("Lote inválido."),
  reason: z
    .string()
    .trim()
    .min(3, "Explica el motivo de la baja.")
    .max(300, "El motivo es demasiado largo."),
});
