#!/usr/bin/env node
/**
 * Crea (o repara) el primer administrador de la tienda.
 *
 * Uso:
 *   npm run db:bootstrap-admin -- --email admin@tienda.com --password "ClaveSegura123" --name "Ana Admin"
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * La clave de servicio se usa solo en este script local. Nunca se envía al
 * navegador ni se incluye en el bundle de Next.js.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
Uso:
  npm run db:bootstrap-admin -- --email <correo> --password <contraseña> [--name <nombre>]

Si el usuario ya existe en Auth, actualiza su contraseña (cuando se envía),
confirma el correo y lo promueve a administrador.
`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = values.email?.trim().toLowerCase();
const password = values.password;
const fullName = values.name?.trim() || "Administrador";

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  fail(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa .env.local.",
  );
}

if (!email) fail("Debes indicar --email.");
if (password && password.length < 8) {
  fail("La contraseña debe tener al menos 8 caracteres.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === targetEmail,
    );

    if (match) return match;
    if (data.users.length < 200) return null;

    page += 1;
  }
}

async function main() {
  console.log(`\nBotica · bootstrap de administrador`);
  console.log(`Proyecto: ${url}`);
  console.log(`Correo:   ${email}\n`);

  const { data: role, error: roleError } = await admin
    .from("roles")
    .select("id, code")
    .eq("code", "admin")
    .maybeSingle();

  if (roleError) throw roleError;

  if (!role) {
    fail(
      "No existe el rol admin. Aplica las migraciones de supabase/migrations antes de ejecutar este script.",
    );
  }

  let user = await findUserByEmail(email);
  let created = false;

  if (!user) {
    if (!password) {
      fail(
        "El usuario no existe. Para crearlo necesitas indicar --password (mínimo 8 caracteres).",
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) throw error;
    if (!data.user) fail("Supabase no devolvió el usuario creado.");

    user = data.user;
    created = true;
    console.log("✓ Usuario creado en Supabase Auth.");
  } else {
    const updates = {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: fullName },
      ...(password ? { password } : {}),
    };

    const { error } = await admin.auth.admin.updateUserById(user.id, updates);

    if (error) throw error;
    console.log(
      password
        ? "✓ Usuario existente actualizado y contraseña restablecida."
        : "✓ Usuario existente confirmado (contraseña sin cambios).",
    );
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      role_id: role.id,
      active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  console.log("✓ Perfil activo con rol Administrador.");
  console.log(
    `\nListo. Ingresa en /login con ${email}${created ? " y la contraseña que definiste" : ""}.\n`,
  );
}

main().catch((error) => {
  console.error("\n✖ No se pudo completar el bootstrap:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
