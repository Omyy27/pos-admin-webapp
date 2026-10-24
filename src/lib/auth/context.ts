import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  ProfileRow,
  RoleRow,
  SettingsRow,
} from "@/types/database";
import { CURRENCY_CODE, STORE_TIMEZONE } from "@/lib/constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AuthContext = {
  status: "authenticated";
  user: User;
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
      user: User;
      profile: ProfileRow | null;
      role: RoleRow | null;
    }
  | AuthContext;

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "anonymous" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    let role: RoleRow | null = null;

    if (profile?.role_id) {
      const roleResult = await supabase
        .from("roles")
        .select("*")
        .eq("id", profile.role_id)
        .maybeSingle();
      role = roleResult.data ?? null;
    }

    return { status: "inactive", user, profile, role };
  }

  const [roleResult, linksResult, permissionsResult, settingsResult] =
    await Promise.all([
      supabase.from("roles").select("*").eq("id", profile.role_id).maybeSingle(),
      supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", profile.role_id),
      supabase.from("permissions").select("id, code"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  if (roleResult.error || !roleResult.data) {
    return { status: "inactive", user, profile, role: null };
  }

  const permissionIds = new Set(
    (linksResult.data ?? []).map((link) => link.permission_id),
  );
  const permissions = new Set(
    (permissionsResult.data ?? [])
      .filter((permission) => permissionIds.has(permission.id))
      .map((permission) => permission.code),
  );

  const settings = settingsResult.data ?? fallbackSettings;

  return {
    status: "authenticated",
    user,
    profile,
    role: roleResult.data,
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
