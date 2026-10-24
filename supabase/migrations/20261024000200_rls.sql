-- Seguridad: RLS, permisos de tablas y funciones expuestas a la API.

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_lots enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_item_lots enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.settings enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or private.has_permission('users.manage')
  or private.has_permission('inventory.read')
  or private.has_permission('sales.read_all')
);

create policy profiles_update_admin on public.profiles
for update to authenticated
using (private.has_permission('users.manage'))
with check (private.has_permission('users.manage'));

create policy roles_select on public.roles
for select to authenticated
using (private.has_permission('dashboard.view'));

create policy permissions_select on public.permissions
for select to authenticated
using (private.has_permission('dashboard.view'));

create policy role_permissions_select on public.role_permissions
for select to authenticated
using (private.has_permission('dashboard.view'));

create policy categories_select on public.categories
for select to authenticated
using (private.has_permission('catalog.read'));

create policy categories_insert on public.categories
for insert to authenticated
with check (private.has_permission('catalog.manage'));

create policy categories_update on public.categories
for update to authenticated
using (private.has_permission('catalog.manage'))
with check (private.has_permission('catalog.manage'));

create policy products_select on public.products
for select to authenticated
using (private.has_permission('catalog.read'));

create policy products_insert on public.products
for insert to authenticated
with check (private.has_permission('catalog.manage'));

create policy products_update on public.products
for update to authenticated
using (private.has_permission('catalog.manage'))
with check (private.has_permission('catalog.manage'));

-- Los lotes se leen solo con permiso de inventario. La escritura se hace por RPC.
create policy product_lots_select on public.product_lots
for select to authenticated
using (private.has_permission('inventory.read'));

create policy sales_select on public.sales
for select to authenticated
using (
  private.has_permission('sales.read_all')
  or (
    created_by = auth.uid()
    and private.has_permission('sales.read_own')
  )
);

create policy sale_items_select on public.sale_items
for select to authenticated
using (private.can_read_sale(sale_id));

create policy sale_item_lots_select on public.sale_item_lots
for select to authenticated
using (private.has_permission('sales.read_all'));

create policy inventory_movements_select on public.inventory_movements
for select to authenticated
using (private.has_permission('inventory.read'));

create policy settings_select on public.settings
for select to authenticated
using (private.has_permission('dashboard.view'));

create policy settings_update on public.settings
for update to authenticated
using (private.has_permission('settings.manage'))
with check (private.has_permission('settings.manage'));

-- Permisos de API: denegar todo por defecto y habilitar solo lo necesario.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.products to authenticated;
grant select on public.product_lots to authenticated;
grant select on public.sales to authenticated;
grant select on public.sale_items to authenticated;
grant select on public.sale_item_lots to authenticated;
grant select on public.inventory_movements to authenticated;
grant select, update on public.settings to authenticated;
grant select on public.products_with_stock to authenticated;

grant usage on schema private to authenticated;
grant usage on type public.payment_method to authenticated;
grant usage on type public.sale_status to authenticated;
grant usage on type public.movement_type to authenticated;
grant usage on schema public to authenticated;

revoke execute on all functions in schema private from public;
grant execute on function private.store_today() to authenticated;
grant execute on function private.has_permission(text) to authenticated;
grant execute on function private.can_read_sale(uuid) to authenticated;
grant execute on function private.set_updated_at() to authenticated;

-- El trigger de alta de usuario lo invoca el rol de Auth de Supabase.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;

revoke execute on function public.receive_lot(uuid, text, date, integer, numeric, text) from public;
revoke execute on function public.adjust_lot(uuid, integer, text) from public;
revoke execute on function public.write_off_lot(uuid, text) from public;
revoke execute on function public.create_sale(jsonb, public.payment_method) from public;
revoke execute on function public.void_sale(uuid, text) from public;
revoke execute on function public.sales_totals(timestamptz, timestamptz, public.sale_status, public.payment_method, bigint) from public;

grant execute on function public.receive_lot(uuid, text, date, integer, numeric, text) to authenticated;
grant execute on function public.adjust_lot(uuid, integer, text) to authenticated;
grant execute on function public.write_off_lot(uuid, text) to authenticated;
grant execute on function public.create_sale(jsonb, public.payment_method) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.sales_totals(timestamptz, timestamptz, public.sale_status, public.payment_method, bigint) to authenticated;
