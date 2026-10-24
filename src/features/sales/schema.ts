import { z } from "zod";

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
