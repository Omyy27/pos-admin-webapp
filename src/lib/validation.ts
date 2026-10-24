import { z } from "zod";
import type { ActionResult } from "@/types/database";

export const emptyAction: ActionResult | null = null;

export function fieldErrorsFromZod(
  error: z.ZodError,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    const messages = result[key] ?? [];
    messages.push(issue.message);
    result[key] = messages;
  }

  return result;
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult {
  return { ok: false, message, fieldErrors };
}

export function actionOk(message?: string): ActionResult {
  return { ok: true, message };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.trim() !== ""
  ) {
    return (error as { message: string }).message;
  }

  return "Ocurrió un error inesperado.";
}

const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    return Number(value);
  }, schema);

const optionalText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(500).nullable(),
  )
  .optional();

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

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

export const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(999999),
      }),
    )
    .min(1, "Agrega al menos un producto."),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
});

export const voidSaleSchema = z.object({
  saleId: z.string().uuid("Venta inválida."),
  reason: z
    .string()
    .trim()
    .min(3, "Explica el motivo de la anulación.")
    .max(300, "El motivo es demasiado largo."),
});

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
  roleId: z.coerce.number().int().positive("Selecciona un rol."),
});

export const updateUserSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
  roleId: z.coerce.number().int().positive("Selecciona un rol."),
});

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
