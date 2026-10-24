import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  requireServiceRoleKey,
  requireSupabasePublicEnv,
} from "@/lib/env";

/**
 * Cliente con service_role. Solo debe utilizarse después de comprobar que el
 * usuario autenticado tiene el permiso requerido. Nunca se importa desde el
 * navegador.
 */
export function createAdminClient() {
  const { url } = requireSupabasePublicEnv();
  const serviceRoleKey = requireServiceRoleKey();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
