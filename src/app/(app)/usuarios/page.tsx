import type { Metadata } from "next";
import { ShieldCheck, Users, UserRoundCheck, UserRoundX } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { formatDateShort } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UserRow } from "@/features/users/components/user-row";
import type { ProfileRow, RoleRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Usuarios",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const auth = await requirePermission("users.manage");

  const [profilesResult, rolesResult] = await Promise.all([
    auth.supabase.from("profiles").select("*").order("created_at"),
    auth.supabase.from("roles").select("*").order("id"),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const roles = (rolesResult.data ?? []) as RoleRow[];
  const active = profiles.filter((profile) => profile.active);
  const admins = profiles.filter((profile) => {
    const role = roles.find((item) => item.id === profile.role_id);
    return role?.code === "admin";
  });
  const sellerRole = roles.find((role) => role.code === "seller");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Equipo"
        title="Usuarios y roles"
        description="Controla quién puede vender, administrar inventario o configurar la tienda. Los permisos se aplican en la interfaz, el servidor y la base de datos."
        actions={<CreateUserDialog roles={roles} defaultRoleId={sellerRole?.id} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
              Usuarios
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
              {profiles.length}
            </p>
            <p className="mt-1 text-[11px] text-muted">Cuentas registradas</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Users className="size-5" />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
              Activos
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
              {active.length}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {profiles.length - active.length} inactivos
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#e7f4e8] text-[#276a39]">
            <UserRoundCheck className="size-5" />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
              Administradores
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">
              {admins.length}
            </p>
            <p className="mt-1 text-[11px] text-muted">Acceso completo</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-soft text-[#8a5a16]">
            <ShieldCheck className="size-5" />
          </span>
        </Card>
      </div>

      <div className="rounded-2xl border border-[#d7e7ea] bg-sky px-4 py-3 text-xs leading-relaxed text-[#3a6570]">
        <strong>Importante:</strong> los usuarios se crean sin registro público.
        Para operar esta pantalla, el servidor necesita la variable{" "}
        <code className="rounded bg-white/60 px-1 py-0.5 text-[10px]">
          SUPABASE_SERVICE_ROLE_KEY
        </code>
        . Nunca la expongas en el navegador.
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={<UserRoundX className="size-5" />}
          title="Todavía no hay usuarios"
          description="Crea la primera cuenta o ejecuta el script de bootstrap para dar de alta al administrador inicial."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-xl font-semibold text-ink">
              Cuentas del equipo
            </h2>
            <p className="mt-1 text-xs text-muted">
              Los cambios de rol y estado aplican de inmediato.
            </p>
          </div>
          <div className="divide-y divide-line/80">
            {profiles.map((profile) => (
              <UserRow
                key={profile.id}
                user={profile}
                roles={roles}
                isSelf={profile.id === auth.user.id}
                createdLabel={formatDateShort(
                  profile.created_at,
                  auth.settings.timezone,
                )}
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Matriz de permisos
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-xl border border-line/80 bg-surface-strong p-4"
            >
              <p className="text-sm font-bold text-ink">{role.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {role.description ?? "Sin descripción."}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
