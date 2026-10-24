-- Esquema base de la droguería
-- Todos los importes se guardan en COP (pesos colombianos) con dos decimales.
-- La zona horaria operativa se configura en settings y por defecto es America/Bogota.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.payment_method as enum ('cash', 'card', 'transfer');
create type public.sale_status as enum ('completed', 'voided');
create type public.movement_type as enum ('entry', 'adjustment', 'sale', 'void', 'expiry');

create table public.roles (
  id smallint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z_]+$'),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id smallint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id smallint not null references public.roles(id) on delete restrict,
  permission_id smallint not null references public.permissions(id) on delete restrict,
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null,
  full_name text not null check (length(btrim(full_name)) > 0),
  role_id smallint not null references public.roles(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_id_idx on public.profiles(role_id);
create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_name_lower_idx on public.categories (lower(btrim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null check (length(btrim(sku)) > 0),
  barcode text,
  name text not null check (length(btrim(name)) > 0),
  description text,
  category_id uuid references public.categories(id) on delete restrict,
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  track_lots boolean not null default true,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_barcode_unique unique (barcode)
);

create unique index products_sku_lower_idx on public.products (lower(btrim(sku)));
create index products_category_id_idx on public.products(category_id);
create index products_name_lower_idx on public.products (lower(name));
create index products_active_idx on public.products(active);

create table public.product_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  lot_code text not null check (length(btrim(lot_code)) > 0),
  expires_on date,
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  received_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_lots_identity_unique
    unique nulls not distinct (product_id, lot_code, expires_on)
);

create index product_lots_product_id_idx on public.product_lots(product_id);
create index product_lots_expiry_idx on public.product_lots(expires_on) where quantity > 0;
create index product_lots_quantity_idx on public.product_lots(product_id, quantity) where quantity > 0;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  status public.sale_status not null default 'completed',
  payment_method public.payment_method not null,
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  void_reason text,
  constraint sales_void_consistency check (
    (status = 'completed' and voided_at is null and voided_by is null and void_reason is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null
      and void_reason is not null and length(btrim(void_reason)) > 0)
  )
);

create index sales_created_at_idx on public.sales(created_at desc);
create index sales_created_by_idx on public.sales(created_by);
create index sales_status_idx on public.sales(status);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  constraint sale_item_total_matches check (line_total = round(quantity * unit_price, 2))
);

create index sale_items_sale_id_idx on public.sale_items(sale_id);
create index sale_items_product_id_idx on public.sale_items(product_id);

create table public.sale_item_lots (
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  lot_id uuid not null references public.product_lots(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  primary key (sale_item_id, lot_id)
);

create index sale_item_lots_lot_id_idx on public.sale_item_lots(lot_id);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid not null references public.product_lots(id) on delete restrict,
  type public.movement_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  resulting_quantity integer not null check (resulting_quantity >= 0),
  reason text,
  sale_id uuid references public.sales(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index inventory_movements_created_at_idx on public.inventory_movements(created_at desc);
create index inventory_movements_product_id_idx on public.inventory_movements(product_id);
create index inventory_movements_lot_id_idx on public.inventory_movements(lot_id);
create index inventory_movements_sale_id_idx on public.inventory_movements(sale_id);

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Mi Droguería' check (length(btrim(store_name)) > 0),
  address text,
  phone text,
  currency_code char(3) not null default 'COP',
  timezone text not null default 'America/Bogota',
  expiry_alert_days integer not null default 30 check (expiry_alert_days between 1 and 365),
  prices_include_tax boolean not null default true,
  receipt_footer text,
  updated_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.roles (code, name, description) values
  ('admin', 'Administrador', 'Acceso completo a la operación y la configuración.'),
  ('seller', 'Vendedor', 'Punto de venta y consulta de sus propios tickets.'),
  ('inventory', 'Inventario', 'Catálogo, lotes, existencias y alertas de vencimiento.')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description;

insert into public.permissions (code, description) values
  ('dashboard.view', 'Ver el panel principal.'),
  ('catalog.read', 'Consultar productos y categorías.'),
  ('catalog.manage', 'Crear y editar productos y categorías.'),
  ('inventory.read', 'Consultar lotes, costos y movimientos.'),
  ('inventory.manage', 'Registrar entradas, ajustes y bajas.'),
  ('sales.create', 'Registrar ventas.'),
  ('sales.read_own', 'Consultar las ventas propias.'),
  ('sales.read_all', 'Consultar todas las ventas y sus costos.'),
  ('sales.void', 'Anular ventas.'),
  ('users.manage', 'Administrar usuarios y roles.'),
  ('settings.manage', 'Editar la configuración de la tienda.')
on conflict (code) do update
  set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view',
  'catalog.read',
  'sales.create',
  'sales.read_own'
)
where r.code = 'seller'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view',
  'catalog.read',
  'catalog.manage',
  'inventory.read',
  'inventory.manage'
)
where r.code = 'inventory'
on conflict do nothing;

insert into public.settings (id) values (1)
on conflict (id) do nothing;

comment on table public.products is 'Catálogo. El stock no se guarda aquí: se deriva de product_lots.';
comment on table public.product_lots is 'Saldo operativo por lote. Los cambios se realizan mediante funciones SQL auditadas.';
comment on table public.inventory_movements is 'Bitácora inmutable de entradas, ventas, anulaciones, ajustes y bajas.';
comment on table public.sale_item_lots is 'Trazabilidad de los lotes consumidos por cada renglón de venta.';
