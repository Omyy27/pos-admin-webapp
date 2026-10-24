"use server";

import { revalidatePath } from "next/cache";
import { getActionAuth } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isServiceRoleConfigured,
} from "@/lib/env";
import {
  actionError,
  actionOk,
  errorMessage,
  fieldErrorsFromZod,
} from "@/lib/validation";
import { createUserSchema, updateUserSchema } from "./schema";
import type { ActionResult } from "@/types/database";

export async function createUserAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("users.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  if (!isServiceRoleConfigured()) {
    return actionError(
      "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios.",
    );
  }

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("role_id"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa los datos del usuario.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { data: role } = await auth.supabase
    .from("roles")
    .select("id, code")
    .eq("id", parsed.data.roleId)
    .maybeSingle();

  if (!role) return actionError("El rol seleccionado no existe.");

  let admin;
  try {
    admin = createAdminClient();
  } catch (adminError) {
    return actionError(errorMessage(adminError));
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "No se pudo crear el usuario.";
    return actionError(
      message.toLowerCase().includes("already")
        ? "Ya existe un usuario con ese correo."
        : message,
    );
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role_id: parsed.data.roleId,
      active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return actionError(
      `El usuario se creó en Auth, pero no se pudo asignar el perfil: ${profileError.message}`,
    );
  }

  revalidatePath("/usuarios");
  return actionOk("Usuario creado con su rol.");
}

export async function updateUserRoleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("users.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("user_id"),
    roleId: formData.get("role_id"),
  });

  if (!parsed.success) {
    return actionError(
      "Revisa el rol seleccionado.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  if (parsed.data.userId === auth.user.id) {
    return actionError("No puedes cambiar tu propio rol.");
  }

  const { data: target } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (!target) return actionError("El usuario no existe.");

  const { error: updateError } = await auth.supabase
    .from("profiles")
    .update({ role_id: parsed.data.roleId })
    .eq("id", parsed.data.userId);

  if (updateError) return actionError(errorMessage(updateError));

  revalidatePath("/usuarios");
  return actionOk("Rol actualizado.");
}

export async function toggleUserActiveAction(formData: FormData): Promise<ActionResult> {
  const { auth, error } = await getActionAuth("users.manage");
  if (!auth) return actionError(error ?? "No autorizado.");

  const userId = formData.get("user_id");
  const active = formData.get("active") === "true";

  if (typeof userId !== "string") return actionError("Usuario inválido.");

  if (userId === auth.user.id && !active) {
    return actionError("No puedes desactivar tu propia cuenta.");
  }

  const { data: target } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return actionError("El usuario no existe.");

  const { error: updateError } = await auth.supabase
    .from("profiles")
    .update({ active })
    .eq("id", userId);

  if (updateError) return actionError(errorMessage(updateError));

  revalidatePath("/usuarios");
  return actionOk(active ? "Usuario activado." : "Usuario desactivado.");
}
