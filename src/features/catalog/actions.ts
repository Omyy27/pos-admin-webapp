"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionAuth } from "@/lib/auth/context";
import {
  actionError,
  actionOk,
  fieldErrorsFromZod,
} from "@/lib/validation";
import { categorySchema, productSchema } from "./schema";
import type { ActionResult } from "@/types/database";

function catalogError(error: { code?: string; message: string }): ActionResult {
  if (error.code === "23505") {
    return actionError(
      "Ya existe un producto o categoría con esos datos (SKU, código de barras o nombre).",
    );
  }

  return actionError(error.message);
}

export async function createCategoryAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("catalog.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los campos de la categoría.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: insertError } = await auth.supabase.from("categories").insert({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    active: parsed.data.active,
    created_by: auth.user.id,
  });

  if (insertError) return catalogError(insertError);

  revalidatePath("/productos");
  revalidatePath("/productos/categorias");
  return actionOk("Categoría creada.");
}

export async function updateCategoryAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("catalog.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const id = formData.get("id");
  if (typeof id !== "string") return actionError("Categoría inválida.");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los campos de la categoría.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: updateError } = await auth.supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      active: parsed.data.active,
    })
    .eq("id", id);

  if (updateError) return catalogError(updateError);

  revalidatePath("/productos");
  revalidatePath("/productos/categorias");
  return actionOk("Categoría actualizada.");
}

function productPayload(parsed: {
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  salePrice: number;
  minStock: number;
  trackLots: boolean;
  active: boolean;
}) {
  return {
    sku: parsed.sku,
    barcode: parsed.barcode || null,
    name: parsed.name,
    description: parsed.description ?? null,
    category_id: parsed.categoryId || null,
    sale_price: parsed.salePrice,
    min_stock: parsed.minStock,
    track_lots: parsed.trackLots,
    active: parsed.active,
  };
}

export async function createProductAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("catalog.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("category_id"),
    salePrice: formData.get("sale_price"),
    minStock: formData.get("min_stock"),
    trackLots: formData.get("track_lots"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos del producto.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { data, error: insertError } = await auth.supabase
    .from("products")
    .insert({
      ...productPayload(parsed.data),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select("id")
    .single();

  if (insertError) return catalogError(insertError);

  revalidatePath("/productos");
  redirect(`/productos/${data.id}`);
}

export async function updateProductAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("catalog.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const id = formData.get("id");
  if (typeof id !== "string") return actionError("Producto inválido.");

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("category_id"),
    salePrice: formData.get("sale_price"),
    minStock: formData.get("min_stock"),
    trackLots: formData.get("track_lots"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos del producto.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { error: updateError } = await auth.supabase
    .from("products")
    .update({
      ...productPayload(parsed.data),
      updated_by: auth.user.id,
    })
    .eq("id", id);

  if (updateError) return catalogError(updateError);

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  revalidatePath("/pos");
  redirect(`/productos/${id}`);
}
