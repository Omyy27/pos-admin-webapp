"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createUserAction } from "@/actions/users";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { ActionResult, RoleRow } from "@/types/database";

export function CreateUserDialog({
  roles,
  defaultRoleId,
}: {
  roles: RoleRow[];
  defaultRoleId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createUserAction(null, formData);
    setState(result);

    if (result.ok) {
      toast.success(result.message ?? "Usuario creado.");
      setOpen(false);
      formRef.current?.reset();
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setState(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader
          title="Crear usuario"
          description="La cuenta se crea confirmada y puede ingresar de inmediato con la contraseña temporal que definas."
        />
        <form ref={formRef} action={handleSubmit} className="mt-5 space-y-4">
          <FormMessage message={state && !state.ok ? state.message : undefined} />

          <Field label="Nombre completo" htmlFor="new_user_name" required>
            <Input
              id="new_user_name"
              name="full_name"
              placeholder="Ej. Laura Gómez"
              maxLength={120}
              required
            />
          </Field>

          <Field label="Correo electrónico" htmlFor="new_user_email" required>
            <Input
              id="new_user_email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="laura@drogueria.com"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contraseña temporal"
              htmlFor="new_user_password"
              required
              hint="Mínimo 8 caracteres."
            >
              <Input
                id="new_user_password"
                name="password"
                type="text"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                maxLength={72}
                required
              />
            </Field>

            <Field label="Rol" htmlFor="new_user_role" required>
              <Select
                id="new_user_role"
                name="role_id"
                defaultValue={String(defaultRoleId ?? roles[0]?.id ?? "")}
                required
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            Comparte la contraseña por un canal seguro. El usuario podrá
            cambiarla más adelante desde Supabase o con ayuda de un
            administrador.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton pendingLabel="Creando usuario…">
              <UserPlus className="size-4" />
              Crear usuario
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
