import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  ProfileRow,
  RoleRow,
  SettingsRow,
} from "@/types/database";
import { CURRENCY_CODE, STORE_TIMEZONE } from "@/lib/constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthContext = {
  status: "authenticated";
  user: AuthUser;
  profile: ProfileRow;
  role: RoleRow;
  permissions: Set<string>;
  settings: SettingsRow;
  supabase: SupabaseServerClient;
  can: (permission: string) => boolean;
};

export type AuthState =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | {
      status: "inactive";
      user: AuthUser;
      profile: ProfileRow | null;
      role: RoleRow | null;
    }
  | AuthContext;

type PermissionLink = {
  permissions: { id: number; code: string } | null;
};

type RoleWithPermissions = RoleRow & {
  role_permissions: PermissionLink[];
};

type ProfileWithRole = ProfileRow & {
  roles: RoleWithPermissions | null;
};

const fallbackSettings: SettingsRow = {
  id: 1,
  store_name: "Mi Droguería",
  address: null,
  phone: null,
  currency_code: CURRENCY_CODE,
  timezone: STORE_TIMEZONE,
  expiry_alert_days: 30,
  prices_include_tax: true,
  receipt_footer: null,
  updated_by: null,
  updated_at: new Date().toISOString(),
};

export const getAuthState = cache(async (): Promise<AuthState> => {
  if (!isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  const supabase = await createClient();

  // getClaims verifica la firma del JWT localmente cuando el proyecto usa
  // claves asimétricas (ES256/RS256). Solo consulta al servidor de Auth si el
  // token está por expirar o si la firma no se puede validar localmente.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) {
    return { status: "anonymous" };
  }

  const user: AuthUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };

  // Una sola consulta resuelve perfil, rol y permisos. settings se pide en
  // paralelo para no encadenar una segunda ida y vuelta.
  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, roles(*, role_permissions(permissions(id, code)))")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  // Los tipos generados no declaran las relaciones embebidas; el cast refleja
  // la forma que devuelve PostgREST para este select.
  const profile = profileResult.data as unknown as ProfileWithRole | null;
  const settings = settingsResult.data ?? fallbackSettings;

  if (!profile || !profile.active) {
    return {
      status: "inactive",
      user,
      profile,
      role: profile?.roles ?? null,
    };
  }

  if (!profile.roles) {
    return {
      status: "inactive",
      user,
      profile,
      role: null,
    };
  }

  const permissions = new Set(
    (profile.roles.role_permissions ?? [])
      .map((link) => link.permissions?.code)
      .filter((code): code is string => Boolean(code)),
  );

  const role: RoleRow = {
    id: profile.roles.id,
    code: profile.roles.code,
    name: profile.roles.name,
    description: profile.roles.description,
    created_at: profile.roles.created_at,
  };

  return {
    status: "authenticated",
    user,
    profile,
    role,
    permissions,
    settings,
    supabase,
    can: (permission: string) => permissions.has(permission),
  };
});

export async function requireAuthContext(): Promise<AuthContext> {
  const state = await getAuthState();

  if (state.status === "unconfigured") {
    redirect("/login?setup=1");
  }

  if (state.status !== "authenticated") {
    redirect("/login");
  }

  return state;
}

export async function requirePermission(
  permission: string,
): Promise<AuthContext> {
  const auth = await requireAuthContext();

  if (!auth.can(permission)) {
    redirect("/sin-permiso");
  }

  return auth;
}

export async function getActionAuth(permission?: string) {
  const state = await getAuthState();

  if (state.status === "unconfigured") {
    return {
      auth: null,
      error: "Supabase todavía no está configurado." as string,
    };
  }

  if (state.status !== "authenticated") {
    return {
      auth: null,
      error: "Tu sesión no es válida o tu cuenta está inactiva." as string,
    };
  }

  if (permission && !state.can(permission)) {
    return {
      auth: null,
      error: "No tienes permisos para realizar esta acción." as string,
    };
  }

  return { auth: state, error: null };
}
