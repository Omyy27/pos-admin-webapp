"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, PackagePlus } from "lucide-react";
import { receiveLotAction } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import type { ActionResult } from "@/types/database";

export type ReceiveProductOption = {
  id: string;
  name: string;
  sku: string;
  track_lots: boolean;
};

export function ReceiveLotDialog({
  products,
  initialProductId,
  triggerLabel = "Registrar entrada",
  triggerVariant = "primary",
  triggerSize = "md",
}: {
  products: ReceiveProductOption[];
  initialProductId?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState(initialProductId ?? "");

  const selectedProduct = products.find((product) => product.id === selectedId);
  const tracksLots = selectedProduct?.track_lots ?? true;

  async function handleSubmit(formData: FormData) {
    const result = await receiveLotAction(null, formData);
    setState(result);

    if (result.ok) {
      toast.success(result.message ?? "Entrada registrada.");
      setOpen(false);
      formRef.current?.reset();
      setSelectedId(initialProductId ?? "");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setState(null);
    if (next) {
      setSelectedId(initialProductId ?? "");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <PackagePlus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader
          title="Registrar entrada"
          description="Suma unidades a un lote existente o crea uno nuevo. El costo se pondera automáticamente."
        />

        <form ref={formRef} action={handleSubmit} className="mt-5 space-y-4">
          <FormMessage message={state && !state.ok ? state.message : undefined} />

          <Field label="Producto" htmlFor="receive_product" required>
            <Select
              id="receive_product"
              name="product_id"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              required
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </Select>
          </Field>

          {selectedProduct ? (
            tracksLots ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código de lote" htmlFor="receive_lot_code" required>
                  <Input
                    id="receive_lot_code"
                    name="lot_code"
                    placeholder="Ej. L-2026-04"
                    maxLength={80}
                    required
                  />
                </Field>
                <Field
                  label="Fecha de caducidad"
                  htmlFor="receive_expires_on"
                  required
                  hint="No se aceptan lotes ya vencidos."
                >
                  <Input
                    id="receive_expires_on"
                    name="expires_on"
                    type="date"
                    required
                  />
                </Field>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-line bg-canvas px-3.5 py-3 text-xs leading-relaxed text-muted">
                <CalendarPlus className="mt-0.5 size-4 shrink-0 text-brand" />
                Este producto no controla lotes: se abastecerá un lote interno
                GENERAL sin fecha de caducidad.
              </div>
            )
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-canvas/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
              Elige un producto para completar los datos del lote.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cantidad" htmlFor="receive_quantity" required>
              <Input
                id="receive_quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                required
              />
            </Field>
            <Field
              label="Costo unitario (COP)"
              htmlFor="receive_unit_cost"
              required
              hint="Solo visible para inventario y administración."
            >
              <Input
                id="receive_unit_cost"
                name="unit_cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                required
              />
            </Field>
          </div>

          <Field label="Nota" htmlFor="receive_note" hint="Opcional, para la bitácora.">
            <Textarea
              id="receive_note"
              name="note"
              placeholder="Factura, proveedor o detalle de la entrada."
              maxLength={300}
              className="min-h-20"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton pendingLabel="Registrando…" disabled={!selectedId}>
              Registrar entrada
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
