"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Save, Tag } from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
} from "../actions";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/card";
import type { CategoryRow } from "@/types/database";

function CategoryCreateForm() {
  const [state, formAction] = useActionState(createCategoryAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Categoría creada.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormMessage message={state && !state.ok ? state.message : undefined} />
      <Field
        label="Nombre"
        htmlFor="new_category_name"
        required
        error={!state?.ok ? state?.fieldErrors?.name?.[0] : undefined}
      >
        <Input
          id="new_category_name"
          name="name"
          placeholder="Ej. Cuidado de la piel"
          maxLength={80}
          required
        />
      </Field>
      <Field label="Descripción" htmlFor="new_category_description">
        <Textarea
          id="new_category_description"
          name="description"
          placeholder="Una nota breve para el equipo."
          className="min-h-20"
          maxLength={500}
        />
      </Field>
      <input type="hidden" name="active" value="on" />
      <SubmitButton className="w-full" pendingLabel="Creando…">
        <Plus className="size-4" />
        Crear categoría
      </SubmitButton>
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryRow }) {
  const [state, formAction] = useActionState(updateCategoryAction, null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Categoría actualizada.");
      detailsRef.current?.removeAttribute("open");
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-line bg-surface-strong p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Tag className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-ink">{category.name}</p>
            <Badge tone={category.active ? "success" : "neutral"}>
              {category.active ? "Activa" : "Inactiva"}
            </Badge>
          </div>
          {category.description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {category.description}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-muted/60">Sin descripción</p>
          )}
        </div>
      </div>

      <details ref={detailsRef} className="group mt-3">
        <summary className="w-fit cursor-pointer text-[11px] font-bold text-brand hover:text-brand-deep">
          Editar categoría
        </summary>
        <form action={formAction} className="mt-3 space-y-3 border-t border-line pt-3">
          <input type="hidden" name="id" value={category.id} />
          <FormMessage message={state && !state.ok ? state.message : undefined} />
          <Field
            label="Nombre"
            htmlFor={`category_name_${category.id}`}
            error={!state?.ok ? state?.fieldErrors?.name?.[0] : undefined}
          >
            <Input
              id={`category_name_${category.id}`}
              name="name"
              defaultValue={category.name}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor={`category_description_${category.id}`}>
            <Textarea
              id={`category_description_${category.id}`}
              name="description"
              defaultValue={category.description ?? ""}
              className="min-h-20"
              maxLength={500}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={category.active}
              className="size-4 accent-[var(--brand)]"
            />
            Categoría activa
          </label>
          <SubmitButton size="sm" variant="outline" pendingLabel="Guardando…">
            <Save className="size-3.5" />
            Guardar
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

export function CategoryManager({
  categories,
  canManage,
}: {
  categories: CategoryRow[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
      {canManage ? (
        <div className="h-fit rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-ink">
            Nueva categoría
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Organiza el catálogo para encontrar productos más rápido en el punto
            de venta.
          </p>
          <div className="mt-5">
            <CategoryCreateForm />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
          Tienes acceso de lectura al catálogo. Solo administradores e
          inventario pueden editar categorías.
        </div>
      )}

      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
            <p className="text-sm font-bold text-ink">Todavía no hay categorías</p>
            <p className="mt-1 text-xs text-muted">
              Crea la primera para agrupar tus productos.
            </p>
          </div>
        ) : (
          categories.map((category) =>
            canManage ? (
              <CategoryRow key={category.id} category={category} />
            ) : (
              <div
                key={category.id}
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink">{category.name}</p>
                  <Badge tone={category.active ? "success" : "neutral"}>
                    {category.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {category.description ? (
                  <p className="mt-1 text-xs text-muted">{category.description}</p>
                ) : null}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
