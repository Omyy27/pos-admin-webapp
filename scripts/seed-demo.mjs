#!/usr/bin/env node
/**
 * Carga datos de demostración en una tienda vacía.
 *
 * Uso:
 *   npm run db:seed-demo -- --email admin@tienda.com --password "ClaveSegura123"
 *
 * El script inicia sesión como administrador y usa las mismas RPC y reglas RLS
 * que la aplicación. No usa service_role, así que valida de paso los permisos
 * y las funciones FEFO.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
Uso:
  npm run db:seed-demo -- --email <admin> --password <contraseña>

Se pueden usar DEMO_EMAIL y DEMO_PASSWORD del entorno.
`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const email = values.email ?? process.env.DEMO_EMAIL;
const password = values.password ?? process.env.DEMO_PASSWORD;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!url || !anonKey) {
  fail(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local.",
  );
}

if (!email || !password) {
  fail(
    "Debes indicar --email y --password (o definir DEMO_EMAIL y DEMO_PASSWORD).",
  );
}

const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function monthsFromNow(months) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return dateOnly(date);
}

const demoCategories = [
  {
    name: "Cuidado personal",
    description: "Cremas, jabones y productos de aseo diario.",
  },
  {
    name: "Medicamentos",
    description: "Venta libre y formulados de uso frecuente.",
  },
  {
    name: "Primeros auxilios",
    description: "Curaciones, antisépticos y vendajes.",
  },
  {
    name: "Bebés",
    description: "Pañales, cremas y cuidado infantil.",
  },
];

const demoProducts = [
  {
    sku: "JAB-001",
    barcode: "7701000000011",
    name: "Jabón de glicerina neutro 90 g",
    category: "Cuidado personal",
    sale_price: 4500,
    min_stock: 12,
    track_lots: true,
    lots: [
      { code: "JAB-A", expires: 8, quantity: 36, cost: 2400 },
      { code: "JAB-B", expires: 18, quantity: 24, cost: 2550 },
    ],
  },
  {
    sku: "CRE-002",
    barcode: "7701000000028",
    name: "Crema hidratante neutra 250 ml",
    category: "Cuidado personal",
    sale_price: 18900,
    min_stock: 8,
    track_lots: true,
    lots: [{ code: "CRE-A", expires: 14, quantity: 18, cost: 11200 }],
  },
  {
    sku: "ACE-003",
    barcode: "7701000000035",
    name: "Acetaminofén 500 mg caja x 20",
    category: "Medicamentos",
    sale_price: 3600,
    min_stock: 20,
    track_lots: true,
    lots: [
      { code: "ACE-A", expires: 5, quantity: 40, cost: 1800 },
      { code: "ACE-B", expires: 20, quantity: 80, cost: 1900 },
    ],
  },
  {
    sku: "IBU-004",
    barcode: "7701000000042",
    name: "Ibuprofeno 400 mg caja x 10",
    category: "Medicamentos",
    sale_price: 5200,
    min_stock: 15,
    track_lots: true,
    lots: [{ code: "IBU-A", expires: 11, quantity: 30, cost: 2700 }],
  },
  {
    sku: "ALG-005",
    barcode: "7701000000059",
    name: "Alcohol antiséptico 70% 500 ml",
    category: "Primeros auxilios",
    sale_price: 9800,
    min_stock: 10,
    track_lots: true,
    lots: [{ code: "ALG-A", expires: 28, quantity: 22, cost: 5600 }],
  },
  {
    sku: "VEN-006",
    barcode: "7701000000066",
    name: "Venda elástica 10 cm x 4.5 m",
    category: "Primeros auxilios",
    sale_price: 6500,
    min_stock: 6,
    track_lots: false,
    lots: [{ code: "", expires: null, quantity: 15, cost: 3200 }],
  },
  {
    sku: "PAN-007",
    barcode: "7701000000073",
    name: "Pañales etapa 3 x 30 unidades",
    category: "Bebés",
    sale_price: 32900,
    min_stock: 5,
    track_lots: true,
    lots: [{ code: "PAN-A", expires: 22, quantity: 9, cost: 21500 }],
  },
  {
    sku: "GAS-008",
    barcode: "7701000000080",
    name: "Gasa estéril 10 x 10 cm sobre x 5",
    category: "Primeros auxilios",
    sale_price: 2800,
    min_stock: 25,
    track_lots: true,
    lots: [{ code: "GAS-A", expires: 30, quantity: 60, cost: 1300 }],
  },
];

async function ensureCategory(name, description) {
  const { data: existing, error: findError } = await supabase
    .from("categories")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) {
    console.log(`· Categoría existente: ${name}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, description, active: true })
    .select("id")
    .single();

  if (error) throw error;
  console.log(`✓ Categoría creada: ${name}`);
  return data.id;
}

async function ensureProduct(product, categoryId, profileId) {
  const { data: existing, error: findError } = await supabase
    .from("products")
    .select("id, sku, track_lots")
    .eq("sku", product.sku)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    console.log(`· Producto existente: ${product.sku} · ${product.name}`);
    return existing;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      category_id: categoryId,
      sale_price: product.sale_price,
      min_stock: product.min_stock,
      track_lots: product.track_lots,
      active: true,
      created_by: profileId,
      updated_by: profileId,
    })
    .select("id, sku, track_lots")
    .single();

  if (error) throw error;
  console.log(`✓ Producto creado: ${product.sku} · ${product.name}`);
  return data;
}

async function ensureLots(product, productId) {
  const { count, error: countError } = await supabase
    .from("product_lots")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    console.log(`  · Lotes existentes, no se duplican.`);
    return;
  }

  for (const lot of product.lots) {
    const { error } = await supabase.rpc("receive_lot", {
      p_product_id: productId,
      p_lot_code: lot.code,
      p_expires_on: lot.expires == null ? null : monthsFromNow(lot.expires),
      p_quantity: lot.quantity,
      p_unit_cost: lot.cost,
      p_note: "Carga de demostración",
    });

    if (error) {
      throw new Error(
        `No se pudo recibir el lote ${lot.code || "GENERAL"} de ${product.sku}: ${error.message}`,
      );
    }

    console.log(
      `  ✓ Entrada ${lot.quantity} u.${lot.code ? ` · lote ${lot.code}` : " · lote GENERAL"}`,
    );
  }
}

async function main() {
  console.log(`\nBotica · datos de demostración`);
  console.log(`Proyecto: ${url}`);
  console.log(`Usuario:  ${email}\n`);

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.user) {
    fail(
      `No se pudo iniciar sesión: ${authError?.message ?? "usuario no disponible"}. Ejecuta primero db:bootstrap-admin.`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, active, role_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.active) {
    fail("El perfil del usuario está inactivo. Actívalo antes de cargar datos.");
  }

  const { data: role } = await supabase
    .from("roles")
    .select("code")
    .eq("id", profile.role_id)
    .maybeSingle();

  if (role?.code !== "admin") {
    fail("Se necesita un usuario con rol Administrador para cargar la demo.");
  }

  const categoryIds = new Map();

  for (const category of demoCategories) {
    const id = await ensureCategory(category.name, category.description);
    categoryIds.set(category.name, id);
  }

  for (const product of demoProducts) {
    const categoryId = categoryIds.get(product.category);
    const created = await ensureProduct(product, categoryId, authData.user.id);
    await ensureLots(product, created.id);
  }

  await supabase.auth.signOut();

  console.log("\n✓ Datos de demostración cargados.\n");
  console.log("Siguiente paso: abre /pos y registra una venta de prueba.\n");
}

main().catch(async (error) => {
  console.error("\n✖ No se pudo cargar la demo:");
  console.error(error instanceof Error ? error.message : error);
  try {
    await supabase.auth.signOut();
  } catch {
    // ignora errores de cierre de sesión
  }
  process.exit(1);
});
