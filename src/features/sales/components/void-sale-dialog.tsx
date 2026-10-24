"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { voidSaleAction } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types/database";

export function VoidSaleDialog({
  saleId,
  ticketNumber,
}: {
  saleId: string;
  ticketNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionResult | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await voidSaleAction(null, formData);
    setState(result);

    if (result.ok) {
      toast.success(result.message ?? "Venta anulada.");
      setOpen(false);
      router.refresh();
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">
          <Ban className="size-3.5" />
          Anular venta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader
          title={`Anular ticket #${ticketNumber}`}
          description="Las unidades volverán exactamente a los lotes de origen y la venta quedará marcada como anulada. La operación no se puede deshacer."
        />
        <form action={handleSubmit} className="mt-5 space-y-4">
          <input type="hidden" name="sale_id" value={saleId} />
          <FormMessage message={state && !state.ok ? state.message : undefined} />
          <Field label="Motivo de la anulación" htmlFor="void_reason" required>
            <Textarea
              id="void_reason"
              name="reason"
              placeholder="Ej. Cobro duplicado, error de digitación, devolución del cliente…"
              maxLength={300}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant="danger" pendingLabel="Anulando…">
              <Ban className="size-4" />
              Confirmar anulación
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
