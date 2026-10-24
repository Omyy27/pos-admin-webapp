-- Funciones de autorización, transacciones de inventario/ventas y vistas de lectura.

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger product_lots_set_updated_at
before update on public.product_lots
for each row execute function private.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function private.set_updated_at();

create or replace function private.store_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (
    pg_catalog.now() at time zone coalesce(
      (select s.timezone from public.settings s where s.id = 1),
      'America/Bogota'
    )
  )::date;
$$;

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = auth.uid()
      and p.active
      and perm.code = p_permission
  );
$$;

create or replace function private.can_read_sale(p_sale_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sales s
    where s.id = p_sale_id
      and (
        private.has_permission('sales.read_all')
        or (
          s.created_by = auth.uid()
          and private.has_permission('sales.read_own')
        )
      )
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id smallint;
begin
  select r.id into v_role_id from public.roles r where r.code = 'seller';

  if v_role_id is null then
    raise exception 'Los roles base no están configurados.';
  end if;

  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    ),
    v_role_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Stock agregado por producto. La vista es security definer, pero solo devuelve
-- filas a usuarios con permiso de catálogo y nunca expone costos ni lotes.
create or replace view public.products_with_stock
with (security_invoker = false)
as
select
  p.id,
  p.sku,
  p.barcode,
  p.name,
  p.description,
  p.category_id,
  c.name as category_name,
  p.sale_price,
  p.min_stock,
  p.track_lots,
  p.active,
  p.created_at,
  p.updated_at,
  coalesce(l.available_quantity, 0)::integer as available_quantity,
  coalesce(l.expired_quantity, 0)::integer as expired_quantity,
  l.nearest_expiry,
  (p.min_stock > 0 and coalesce(l.available_quantity, 0) <= p.min_stock) as low_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join (
  select
    pl.product_id,
    sum(pl.quantity) filter (
      where pl.expires_on is null or pl.expires_on >= private.store_today()
    ) as available_quantity,
    sum(pl.quantity) filter (
      where pl.expires_on is not null and pl.expires_on < private.store_today()
    ) as expired_quantity,
    min(pl.expires_on) filter (
      where pl.expires_on is null or pl.expires_on >= private.store_today()
    ) as nearest_expiry
  from public.product_lots pl
  where pl.quantity > 0
  group by pl.product_id
) l on l.product_id = p.id
where private.has_permission('catalog.read');

comment on view public.products_with_stock is
  'Disponibilidad agregada por producto. Oculta lotes, costos y movimientos; apta para vendedores.';

create or replace function public.receive_lot(
  p_product_id uuid,
  p_lot_code text,
  p_expires_on date,
  p_quantity integer,
  p_unit_cost numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_lot public.product_lots%rowtype;
  v_code text;
  v_after integer;
  v_lot_id uuid;
  v_new_cost numeric(12, 2);
  v_note text;
begin
  if not private.has_permission('inventory.manage') then
    raise exception 'No tienes permiso para registrar inventario.' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if p_unit_cost is null or p_unit_cost < 0 then
    raise exception 'El costo unitario no puede ser negativo.';
  end if;

  select * into v_product
  from public.products p
  where p.id = p_product_id;

  if not found then
    raise exception 'El producto no existe.';
  end if;

  if not v_product.active then
    raise exception 'No se puede abastecer un producto inactivo.';
  end if;

  if v_product.track_lots then
    v_code := upper(btrim(coalesce(p_lot_code, '')));

    if v_code = '' then
      raise exception 'El código de lote es obligatorio.';
    end if;

    if p_expires_on is null then
      raise exception 'La fecha de caducidad es obligatoria para este producto.';
    end if;

    if p_expires_on < private.store_today() then
      raise exception 'No se puede recibir un lote vencido.';
    end if;
  else
    v_code := 'GENERAL';
    p_expires_on := null;
  end if;

  v_note := coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Entrada de inventario');

  select * into v_lot
  from public.product_lots pl
  where pl.product_id = p_product_id
    and pl.lot_code = v_code
    and pl.expires_on is not distinct from p_expires_on
  for update;

  if found then
    v_new_cost := round(
      ((v_lot.quantity * v_lot.unit_cost) + (p_quantity * p_unit_cost))
      / (v_lot.quantity + p_quantity),
      2
    );

    update public.product_lots
    set quantity = quantity + p_quantity,
        unit_cost = v_new_cost,
        updated_at = pg_catalog.now()
    where id = v_lot.id
    returning id, quantity into v_lot_id, v_after;
  else
    insert into public.product_lots (
      product_id, lot_code, expires_on, unit_cost, quantity, created_by
    )
    values (
      p_product_id, v_code, p_expires_on, p_unit_cost, p_quantity, auth.uid()
    )
    returning id, quantity into v_lot_id, v_after;
  end if;

  insert into public.inventory_movements (
    product_id, lot_id, type, quantity_delta, resulting_quantity, reason, created_by
  )
  values (
    p_product_id, v_lot_id, 'entry', p_quantity, v_after, v_note, auth.uid()
  );

  return jsonb_build_object(
    'lot_id', v_lot_id,
    'product_id', p_product_id,
    'lot_code', v_code,
    'expires_on', p_expires_on,
    'resulting_quantity', v_after
  );
end;
$$;

create or replace function public.adjust_lot(
  p_lot_id uuid,
  p_new_quantity integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.product_lots%rowtype;
  v_delta integer;
  v_after integer;
  v_reason text;
begin
  if not private.has_permission('inventory.manage') then
    raise exception 'No tienes permiso para ajustar inventario.' using errcode = '42501';
  end if;

  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'La cantidad resultante no puede ser negativa.';
  end if;

  v_reason := btrim(coalesce(p_reason, ''));

  if v_reason = '' then
    raise exception 'El motivo del ajuste es obligatorio.';
  end if;

  select * into v_lot
  from public.product_lots pl
  where pl.id = p_lot_id
  for update;

  if not found then
    raise exception 'El lote no existe.';
  end if;

  v_delta := p_new_quantity - v_lot.quantity;

  if v_delta = 0 then
    raise exception 'La cantidad no cambió.';
  end if;

  update public.product_lots
  set quantity = p_new_quantity,
      updated_at = pg_catalog.now()
  where id = p_lot_id
  returning quantity into v_after;

  insert into public.inventory_movements (
    product_id, lot_id, type, quantity_delta, resulting_quantity, reason, created_by
  )
  values (
    v_lot.product_id, p_lot_id, 'adjustment', v_delta, v_after, v_reason, auth.uid()
  );

  return jsonb_build_object('lot_id', p_lot_id, 'resulting_quantity', v_after);
end;
$$;

create or replace function public.write_off_lot(
  p_lot_id uuid,
  p_reason text default 'Vencimiento'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.product_lots%rowtype;
  v_reason text;
begin
  if not private.has_permission('inventory.manage') then
    raise exception 'No tienes permiso para dar de baja inventario.' using errcode = '42501';
  end if;

  v_reason := coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'Vencimiento');

  select * into v_lot
  from public.product_lots pl
  where pl.id = p_lot_id
  for update;

  if not found then
    raise exception 'El lote no existe.';
  end if;

  if v_lot.quantity = 0 then
    raise exception 'El lote ya no tiene existencias.';
  end if;

  update public.product_lots
  set quantity = 0,
      updated_at = pg_catalog.now()
  where id = p_lot_id;

  insert into public.inventory_movements (
    product_id, lot_id, type, quantity_delta, resulting_quantity, reason, created_by
  )
  values (
    v_lot.product_id, p_lot_id, 'expiry', -v_lot.quantity, 0, v_reason, auth.uid()
  );

  return jsonb_build_object('lot_id', p_lot_id, 'resulting_quantity', 0);
end;
$$;

create or replace function public.create_sale(
  p_items jsonb,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale_id uuid;
  v_ticket bigint;
  v_total numeric(12, 2) := 0;
  v_item record;
  v_product public.products%rowtype;
  v_sale_item_id uuid;
  v_remaining integer;
  v_take integer;
  v_lot record;
  v_after integer;
  v_uid uuid := auth.uid();
begin
  if not private.has_permission('sales.create') then
    raise exception 'No tienes permiso para registrar ventas.' using errcode = '42501';
  end if;

  if p_payment_method is null then
    raise exception 'Selecciona un método de pago.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    where x.product_id is null or x.quantity is null or x.quantity <= 0
  ) then
    raise exception 'Hay productos o cantidades inválidas en la venta.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id
    having count(*) > 1
  ) then
    raise exception 'La venta contiene productos duplicados.';
  end if;

  insert into public.sales (payment_method, total, created_by)
  values (p_payment_method, 0, v_uid)
  returning id, ticket_number into v_sale_id, v_ticket;

  for v_item in
    select x.product_id, x.quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    order by x.product_id
  loop
    select * into v_product
    from public.products p
    where p.id = v_item.product_id
      and p.active
    for share;

    if not found then
      raise exception 'Uno de los productos ya no está disponible.';
    end if;

    insert into public.sale_items (
      sale_id, product_id, product_name, product_sku, quantity, unit_price, line_total
    )
    values (
      v_sale_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_item.quantity,
      v_product.sale_price,
      round(v_product.sale_price * v_item.quantity, 2)
    )
    returning id into v_sale_item_id;

    v_remaining := v_item.quantity;

    for v_lot in
      select pl.id, pl.quantity, pl.unit_cost
      from public.product_lots pl
      where pl.product_id = v_product.id
        and pl.quantity > 0
        and (pl.expires_on is null or pl.expires_on >= private.store_today())
      order by pl.expires_on asc nulls last, pl.received_at asc, pl.id
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_lot.quantity);

      update public.product_lots
      set quantity = quantity - v_take,
          updated_at = pg_catalog.now()
      where id = v_lot.id
      returning quantity into v_after;

      insert into public.sale_item_lots (sale_item_id, lot_id, quantity, unit_cost)
      values (v_sale_item_id, v_lot.id, v_take, v_lot.unit_cost);

      insert into public.inventory_movements (
        product_id, lot_id, type, quantity_delta, resulting_quantity, reason, sale_id, created_by
      )
      values (
        v_product.id, v_lot.id, 'sale', -v_take, v_after,
        'Venta #' || v_ticket, v_sale_id, v_uid
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock vigente insuficiente para "%".', v_product.name;
    end if;

    v_total := v_total + round(v_product.sale_price * v_item.quantity, 2);
  end loop;

  update public.sales
  set total = round(v_total, 2)
  where id = v_sale_id;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'ticket_number', v_ticket,
    'total', round(v_total, 2)
  );
end;
$$;

create or replace function public.void_sale(
  p_sale_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales%rowtype;
  v_row record;
  v_after integer;
  v_reason text;
  v_uid uuid := auth.uid();
begin
  if not private.has_permission('sales.void') then
    raise exception 'No tienes permiso para anular ventas.' using errcode = '42501';
  end if;

  v_reason := btrim(coalesce(p_reason, ''));

  if v_reason = '' then
    raise exception 'El motivo de anulación es obligatorio.';
  end if;

  select * into v_sale
  from public.sales s
  where s.id = p_sale_id
  for update;

  if not found then
    raise exception 'La venta no existe.';
  end if;

  if v_sale.status = 'voided' then
    raise exception 'La venta ya está anulada.';
  end if;

  for v_row in
    select sil.lot_id, sil.quantity, si.product_id
    from public.sale_item_lots sil
    join public.sale_items si on si.id = sil.sale_item_id
    where si.sale_id = p_sale_id
  loop
    update public.product_lots
    set quantity = quantity + v_row.quantity,
        updated_at = pg_catalog.now()
    where id = v_row.lot_id
    returning quantity into v_after;

    insert into public.inventory_movements (
      product_id, lot_id, type, quantity_delta, resulting_quantity, reason, sale_id, created_by
    )
    values (
      v_row.product_id, v_row.lot_id, 'void', v_row.quantity, v_after,
      'Anulación venta #' || v_sale.ticket_number || ': ' || v_reason,
      p_sale_id, v_uid
    );
  end loop;

  update public.sales
  set status = 'voided',
      voided_at = pg_catalog.now(),
      voided_by = v_uid,
      void_reason = v_reason
  where id = p_sale_id;

  return jsonb_build_object('sale_id', p_sale_id, 'status', 'voided');
end;
$$;

-- Totales del historial de ventas. Es security invoker: RLS limita las filas
-- que puede ver cada rol (administración ve todo; vendedor solo lo propio).
create or replace function public.sales_totals(
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_status public.sale_status default null,
  p_payment_method public.payment_method default null,
  p_ticket_number bigint default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'completed_count', count(*) filter (where s.status = 'completed'),
    'voided_count', count(*) filter (where s.status = 'voided'),
    'revenue', coalesce(sum(s.total) filter (where s.status = 'completed'), 0)
  )
  from public.sales s
  where (p_start is null or s.created_at >= p_start)
    and (p_end is null or s.created_at <= p_end)
    and (p_status is null or s.status = p_status)
    and (p_payment_method is null or s.payment_method = p_payment_method)
    and (p_ticket_number is null or s.ticket_number = p_ticket_number);
$$;
