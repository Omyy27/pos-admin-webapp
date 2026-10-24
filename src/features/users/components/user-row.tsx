"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power, Save, UserRoundCheck } from "lucide-react";
import {
  toggleUserActiveAction,
  updateUserRoleAction,
} from "../actions";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { initials } from "@/lib/format";
import type { ProfileRow, RoleRow } from "@/types/database";

export function UserRow({
  user,
  roles,
  isSelf,
  createdLabel,
}: {
  user: ProfileRow;
  roles: RoleRow[];
  isSelf: boolean;
  createdLabel: string;
}) {
  const router = useRouter();
  const [roleState, roleAction] = useActionState(updateUserRoleAction, null);
  const [togglePending, startToggle] = useTransition();

  useEffect(() => {
    if (roleState?.ok) {
      toast.success(roleState.message ?? "Rol actualizado.");
    }
  }, [roleState]);

  function handleToggle() {
    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("active", String(!user.active));

    startToggle(async () => {
      const result = await toggleUserActiveAction(formData);

      if (result.ok) {
        toast.success(result.message ?? "Usuario actualizado.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand-deep">
            {initials(user.full_name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-ink">
                {user.full_name}
              </p>
              {isSelf ? <Badge tone="brand">Tu cuenta</Badge> : null}
              <Badge tone={user.active ? "success" : "neutral"}>
                {user.active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {user.email} · Creado el {createdLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="user_id" value={user.id} />
            <Select
              name="role_id"
              defaultValue={String(user.role_id)}
              disabled={isSelf}
              aria-label={`Rol de ${user.full_name}`}
              className="h-9 min-w-[150px] text-xs"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <SubmitButton
              size="sm"
              variant="outline"
              pendingLabel="…"
              disabled={isSelf}
            >
              <Save className="size-3.5" />
              Rol
            </SubmitButton>
          </form>

          <Button
            type="button"
            size="sm"
            variant={user.active ? "ghost" : "soft"}
            className={
              user.active
                ? "text-danger hover:bg-danger-soft"
                : "text-brand-deep"
            }
            onClick={handleToggle}
            disabled={isSelf || togglePending}
          >
            {user.active ? (
              <Power className="size-3.5" />
            ) : (
              <UserRoundCheck className="size-3.5" />
            )}
            {togglePending
              ? "Guardando…"
              : user.active
                ? "Desactivar"
                : "Activar"}
          </Button>
        </div>
      </div>

      {roleState && !roleState.ok ? (
        <div className="mt-3">
          <FormMessage message={roleState.message} />
        </div>
      ) : null}
    </div>
  );
}
