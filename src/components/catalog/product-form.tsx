"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
} from "@/actions/catalog";
import { Field, Input, Select, Textarea, CheckboxRow } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import type { CategoryRow, ProductWithStock } from "@/types/database";

export function ProductForm({
  categories,
  product,
}: {
  categories: CategoryRow[];
  product?: ProductWithStock;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState(action, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <FormMessage message={state && !state.ok ? state.message : undefined} />

      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Identidad del producto
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          El SKU y el código de barras deben ser únicos en el catálogo.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="SKU"
            htmlFor="sku"
            required
            error={errors?.sku?.[0]}
            hint="Se guarda en mayúsculas."
          >
            <Input
              id="sku"
              name="sku"
              defaultValue={product?.sku ?? ""}
              placeholder="EJ. JAB-001"
              maxLength={40}
              required
            />
          </Field>

          <Field
            label="Código de barras"
            htmlFor="barcode"
            error={errors?.barcode?.[0]}
            hint="Opcional. Se puede escanear en el POS."
          >
            <Input
              id="barcode"
              name="barcode"
              defaultValue={product?.barcode ?? ""}
              placeholder="7701234567890"
              maxLength={80}
            />
          </Field>

          <Field
            label="Nombre"
            htmlFor="name"
            required
            className="sm:col-span-2"
            error={errors?.name?.[0]}
          >
            <Input
              id="name"
              name="name"
              defaultValue={product?.name ?? ""}
              placeholder="Ej. Crema hidratante neutra 250 ml"
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Categoría"
            htmlFor="category_id"
            error={errors?.categoryId?.[0]}
            hint="Puedes administrar las categorías desde el catálogo."
          >
            <Select
              id="category_id"
              name="category_id"
              defaultValue={product?.category_id ?? ""}
            >
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.active ? " (inactiva)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Descripción"
            htmlFor="description"
            error={errors?.description?.[0]}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Presentación, indicaciones o notas internas."
              maxLength={500}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Precio y existencias
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          El inventario real no se edita aquí: se registra por lotes. El stock
          mínimo activa las alertas de reposición.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Precio de venta (COP)"
            htmlFor="sale_price"
            required
            error={errors?.salePrice?.[0]}
            hint="Precio final con impuesto incluido."
          >
            <Input
              id="sale_price"
              name="sale_price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.sale_price ?? ""}
              placeholder="12500"
              required
            />
          </Field>

          <Field
            label="Stock mínimo"
            htmlFor="min_stock"
            required
            error={errors?.minStock?.[0]}
            hint="Se avisará cuando el stock disponible esté en este nivel o menos."
          >
            <Input
              id="min_stock"
              name="min_stock"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.min_stock ?? 0}
              required
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <CheckboxRow
            label="Controlar por lote y caducidad"
            hint="Recomendado para medicamentos y productos con vencimiento."
            name="track_lots"
            defaultChecked={product?.track_lots ?? true}
          />
          <CheckboxRow
            label="Producto activo"
            hint="Los productos inactivos no aparecen en el punto de venta."
            name="active"
            defaultChecked={product?.active ?? true}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={product ? `/productos/${product.id}` : "/productos"}
          className={buttonClasses({ variant: "outline" })}
        >
          Cancelar
        </Link>
        <SubmitButton pendingLabel="Guardando producto…">
          <Save className="size-4" />
          {product ? "Guardar cambios" : "Crear producto"}
        </SubmitButton>
      </div>
    </form>
  );
}
