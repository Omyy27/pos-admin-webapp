"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateSettingsAction } from "@/actions/settings";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import type { SettingsRow } from "@/types/database";

export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const [state, formAction] = useActionState(updateSettingsAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Configuración guardada.");
    }
  }, [state]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Datos de la tienda
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Esta información aparece en el ticket y en el encabezado del sistema.
        </p>

        <div className="mt-5 space-y-4">
          <FormMessage message={state && !state.ok ? state.message : undefined} />

          <Field
            label="Nombre de la tienda"
            htmlFor="store_name"
            required
            error={errors?.storeName?.[0]}
          >
            <Input
              id="store_name"
              name="store_name"
              defaultValue={settings.store_name}
              maxLength={120}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Dirección"
              htmlFor="address"
              error={errors?.address?.[0]}
            >
              <Input
                id="address"
                name="address"
                defaultValue={settings.address ?? ""}
                placeholder="Ej. Calle 12 # 34-56, Bogotá"
                maxLength={200}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone" error={errors?.phone?.[0]}>
              <Input
                id="phone"
                name="phone"
                defaultValue={settings.phone ?? ""}
                placeholder="Ej. 601 123 4567"
                maxLength={40}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Operación y ticket
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Ajusta las alertas de caducidad y el mensaje de cierre del comprobante.
        </p>

        <div className="mt-5 space-y-4">
          <Field
            label="Días de alerta por vencimiento"
            htmlFor="expiry_alert_days"
            required
            error={errors?.expiryAlertDays?.[0]}
            hint="Los lotes que vencen dentro de este plazo aparecen como próximos a vencer."
          >
            <Input
              id="expiry_alert_days"
              name="expiry_alert_days"
              type="number"
              min="1"
              max="365"
              step="1"
              defaultValue={settings.expiry_alert_days}
              required
            />
          </Field>

          <Field
            label="Mensaje al pie del ticket"
            htmlFor="receipt_footer"
            error={errors?.receiptFooter?.[0]}
            hint="Máximo 300 caracteres."
          >
            <Textarea
              id="receipt_footer"
              name="receipt_footer"
              defaultValue={settings.receipt_footer ?? ""}
              placeholder="Ej. Gracias por preferirnos. Conserve su ticket."
              maxLength={300}
              className="min-h-20"
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Guardando cambios…">
          <Save className="size-4" />
          Guardar configuración
        </SubmitButton>
      </div>
    </form>
  );
}
