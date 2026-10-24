"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackageX, SlidersHorizontal } from "lucide-react";
import { adjustLotAction, writeOffLotAction } from "@/actions/inventory";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types/database";

export type LotActionTarget = {
  id: string;
  productName: string;
  lotCode: string;
  quantity: number;
  expiresOn: string | null;
};

function AdjustDialog({
  lot,
  open,
  onOpenChange,
}: {
  lot: LotActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ActionResult | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await adjustLotAction(null, formData);
    setState(result);

    if (result.ok) {
      toast.success(result.message ?? "Ajuste registrado.");
      onOpenChange(false);
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Ajustar existencias"
          description={`${lot.productName} · lote ${lot.lotCode}. La cantidad actual es ${lot.quantity} unidades.`}
        />
        <form action={handleSubmit} className="mt-5 space-y-4">
          <input type="hidden" name="lot_id" value={lot.id} />
          <FormMessage message={state && !state.ok ? state.message : undefined} />

          <Field
            label="Cantidad final"
            htmlFor={`new_quantity_${lot.id}`}
            required
            hint="Escribe el saldo real después del conteo físico."
          >
            <Input
              id={`new_quantity_${lot.id}`}
              name="new_quantity"
              type="number"
              min="0"
              step="1"
              defaultValue={lot.quantity}
              required
            />
          </Field>

          <Field label="Motivo" htmlFor={`adjust_reason_${lot.id}`} required>
            <Textarea
              id={`adjust_reason_${lot.id}`}
              name="reason"
              placeholder="Ej. Conteo físico, producto dañado, corrección de digitación…"
              maxLength={300}
              required
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pendingLabel="Ajustando…">
              <SlidersHorizontal className="size-4" />
              Guardar ajuste
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WriteOffDialog({
  lot,
  open,
  onOpenChange,
}: {
  lot: LotActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ActionResult | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await writeOffLotAction(null, formData);
    setState(result);

    if (result.ok) {
      toast.success(result.message ?? "Lote dado de baja.");
      onOpenChange(false);
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Dar de baja el lote"
          description={`Se retirarán ${lot.quantity} unidades de ${lot.productName} (lote ${lot.lotCode}). Esta acción queda auditada.`}
        />
        <form action={handleSubmit} className="mt-5 space-y-4">
          <input type="hidden" name="lot_id" value={lot.id} />
          <FormMessage message={state && !state.ok ? state.message : undefined} />

          <Field label="Motivo" htmlFor={`write_off_reason_${lot.id}`} required>
            <Textarea
              id={`write_off_reason_${lot.id}`}
              name="reason"
              defaultValue="Vencimiento"
              maxLength={300}
              required
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton variant="danger" pendingLabel="Dando de baja…">
              <PackageX className="size-4" />
              Confirmar baja
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LotActions({ lot }: { lot: LotActionTarget }) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAdjustOpen(true)}
      >
        <SlidersHorizontal className="size-3.5" />
        Ajustar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-soft"
        onClick={() => setWriteOffOpen(true)}
      >
        <PackageX className="size-3.5" />
        Baja
      </Button>

      <AdjustDialog
        lot={lot}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
      <WriteOffDialog
        lot={lot}
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
      />
    </div>
  );
}
