import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  requireSecretKey,
  requireSupabasePublicEnv,
} from "@/lib/env";

/**
 * Cliente con secret key. Solo debe utilizarse después de comprobar que el
 * usuario autenticado tiene el permiso requerido. Nunca se importa desde el
 * navegador.
 */
export function createAdminClient() {
  const { url } = requireSupabasePublicEnv();
  const secretKey = requireSecretKey();

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
