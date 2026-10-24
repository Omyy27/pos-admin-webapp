import { z } from "zod";
import { optionalText, requiredNumber } from "@/lib/validation";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre es demasiado largo."),
  description: optionalText,
  active: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "El SKU debe tener al menos 2 caracteres.")
    .max(40, "El SKU es demasiado largo.")
    .transform((value) => value.toUpperCase()),
  barcode: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(80).nullable(),
    )
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  description: optionalText,
  categoryId: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().uuid("Selecciona una categoría válida.").nullable(),
    )
    .optional(),
  salePrice: requiredNumber(
    z
      .number({ error: "Ingresa un precio válido." })
      .nonnegative("El precio no puede ser negativo.")
      .max(999999999, "El precio es demasiado alto."),
  ),
  minStock: requiredNumber(
    z
      .number({ error: "Ingresa un stock mínimo válido." })
      .int("El stock mínimo debe ser entero.")
      .min(0, "El stock mínimo no puede ser negativo.")
      .max(999999, "El stock mínimo es demasiado alto."),
  ),
  trackLots: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  active: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});
