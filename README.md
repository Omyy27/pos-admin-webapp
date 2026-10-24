# Botica · Inventario y punto de venta

Aplicación web para una droguería de una sola tienda. Controla inventario por
lotes con vencimientos, vende con salida FEFO (primero vence, primero sale) y
aplica permisos por rol en la interfaz, el servidor y la base de datos.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript.
- **Estilos:** Tailwind CSS 4 + SCSS Modules.
- **Backend:** Supabase (Auth, Postgres, RLS y RPC).
- **Validación:** Zod.
- **Moneda:** COP, precios finales con impuesto incluido.
- **Zona horaria:** `America/Bogota`.

## Funcionalidad

- Dashboard con ventas del día, ingresos, ticket promedio, stock bajo y
  vencimientos próximos.
- Catálogo con categorías, SKU, código de barras, precio final y stock mínimo.
- Inventario por lote: entradas con costo, ajustes auditados y bajas por
  vencimiento.
- Alertas de caducidad configurables. **Los lotes vencidos nunca se venden.**
- POS con búsqueda por nombre, SKU o escaneo de código de barras, carrito y pago
  único (efectivo, tarjeta o transferencia).
- Historial y detalle de ventas. Anulación por administrador con reposición
  exacta de los lotes de origen.
- Ticket imprimible de 80 mm.
- Usuarios y roles administrados desde la app (sin registro público).
- Bitácora inmutable de movimientos de inventario.

## Requisitos

- Node.js 20.6 o superior (los scripts usan `--env-file`).
- Un proyecto de **Supabase Cloud**. No se necesita Docker.
- Opcional: Supabase CLI para aplicar las migraciones por consola.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com), crea un proyecto y guarda la
   contraseña de la base de datos.
2. En **Project Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

> La clave `service_role` omite RLS. Solo se usa en el servidor para crear
> usuarios. Nunca la pongas en una variable `NEXT_PUBLIC_*` ni la compartas.

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Sin estas variables la app muestra una pantalla de configuración en `/login`;
no falla de forma silenciosa.

### 3. Aplicar las migraciones

**Opción A · Supabase CLI (recomendada)**

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npm run db:push
```

El `project-ref` es el identificador que aparece en la URL del panel
(`https://supabase.com/dashboard/project/<project-ref>`).

**Opción B · SQL Editor**

Abre el SQL Editor del panel y ejecuta, en este orden:

1. `supabase/migrations/20261024000000_schema.sql`
2. `supabase/migrations/20261024000100_functions.sql`
3. `supabase/migrations/20261024000200_rls.sql`

### 4. Crear el primer administrador

El registro público está deshabilitado a propósito. Crea el primer usuario con
el script local:

```bash
npm run db:bootstrap-admin -- \
  --email admin@tudrogueria.com \
  --password "UnaClaveSegura123" \
  --name "Administrador"
```

El script crea el usuario en Supabase Auth, confirma el correo y le asigna el
rol **Administrador**. Si el usuario ya existe, lo repara y lo promueve.

También puedes crear el usuario desde **Authentication → Users** en el panel de
Supabase; el trigger de base de datos le asignará el rol Vendedor. Luego
promuévelo a administrador desde la tabla `profiles` o con el script.

### 5. Cargar datos de demostración (opcional)

Con el administrador ya creado:

```bash
npm run db:seed-demo -- \
  --email admin@tudrogueria.com \
  --password "UnaClaveSegura123"
```

Crea categorías, productos y lotes de ejemplo usando las mismas RPC y reglas RLS
que la aplicación. Es idempotente: no duplica productos ni lotes existentes.

### 6. Ejecutar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e ingresa con el
administrador.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción. |
| `npm run start` | Servidor de producción. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript sin emitir archivos. |
| `npm run db:push` | Aplica migraciones con Supabase CLI. |
| `npm run db:bootstrap-admin` | Crea/repara el administrador inicial. |
| `npm run db:seed-demo` | Carga catálogo y lotes de demostración. |

## Roles y permisos

| Permiso | Administrador | Vendedor | Inventario |
| --- | :---: | :---: | :---: |
| Ver resumen | ✓ | ✓ | ✓ |
| Consultar catálogo | ✓ | ✓ | ✓ |
| Administrar catálogo | ✓ | — | ✓ |
| Consultar lotes y costos | ✓ | — | ✓ |
| Registrar entradas, ajustes y bajas | ✓ | — | ✓ |
| Registrar ventas | ✓ | ✓ | — |
| Ver todas las ventas y costos | ✓ | — | — |
| Ver ventas propias | ✓ | ✓ | — |
| Anular ventas | ✓ | — | — |
| Administrar usuarios | ✓ | — | — |
| Editar configuración | ✓ | — | — |

Los permisos se validan en tres capas:

1. **UI:** la navegación y las acciones se ocultan según el rol.
2. **Servidor:** cada Server Action y página vuelve a comprobar el permiso.
3. **Base de datos:** RLS y funciones `security definer` verifican el permiso
   real del usuario autenticado.

## Cómo funciona el inventario

- El stock **no** se guarda en `products`. Se deriva de `product_lots`.
- La vista `products_with_stock` calcula cantidades disponibles y vencidas.
- Cada entrada, ajuste, venta, anulación o baja genera un registro en
  `inventory_movements` con usuario, fecha y saldo resultante.
- Las ventas se registran con `create_sale`, una función transaccional que:
  1. Lee el precio vigente desde la base de datos (nunca desde el navegador).
  2. Bloquea los lotes y descuenta primero los de vencimiento más próximo.
  3. Rechaza la venta completa si no hay stock vigente suficiente.
  4. Guarda la trazabilidad de los lotes consumidos en `sale_item_lots`.
- La anulación (`void_sale`) repone exactamente las unidades a sus lotes de
  origen y deja la venta marcada como anulada.
- Los productos sin control de lote usan un lote interno `GENERAL` sin fecha de
  caducidad.

## Estructura del proyecto

```text
src/
  actions/              Server Actions (catálogo, inventario, ventas, usuarios…)
  app/
    (app)/              Área autenticada con sidebar y topbar
    (auth)/login/       Inicio de sesión y aviso de configuración
    (print)/            Ticket imprimible sin interfaz de la app
  components/           UI, catálogo, inventario, POS, ventas, usuarios…
  lib/
    auth/               Contexto de sesión, permisos y acciones de login
    supabase/           Clientes server y service_role
    format.ts           COP, fechas, zona horaria y periodos
    validation.ts       Esquemas Zod
  proxy.ts              Refresco de sesión y protección de rutas
supabase/migrations/     Esquema, funciones, RLS y datos base
scripts/                 Bootstrap del administrador y demo
```

## Seguridad

- RLS habilitado en todas las tablas del esquema `public`.
- El rol `authenticated` solo tiene los privilegios necesarios; `anon` no tiene
  acceso a las tablas.
- Las funciones de inventario y ventas son `security definer`, pero verifican
  `auth.uid()` y el permiso correspondiente antes de operar.
- `service_role` solo se instancia en `src/lib/supabase/admin.ts` y en los
  scripts locales.
- No existe registro público. Un administrador crea las cuentas.
- No se confía en precios ni totales enviados por el cliente.

## Despliegue

1. Sube el repositorio a tu proveedor (por ejemplo Vercel).
2. Configura las tres variables de entorno del proyecto.
3. Aplica las migraciones al proyecto de Supabase de producción.
4. Ejecuta el bootstrap del administrador contra ese proyecto.
5. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurada solo como variable
   de servidor.

## Solución de problemas

- **`/login` muestra “Falta conectar Supabase”:** revisa `.env.local` y reinicia
  el servidor de desarrollo.
- **No se pueden crear usuarios:** falta `SUPABASE_SERVICE_ROLE_KEY` en el
  servidor.
- **“Stock vigente insuficiente”:** el producto no tiene lotes vigentes
  suficientes; registra una entrada o revisa los vencimientos.
- **No aparece ningún dato:** confirma que las migraciones se aplicaron y que el
  perfil del usuario está activo y tiene rol asignado.
- **Error al aplicar migraciones:** ejecútalas en orden. La primera crea el
  esquema `private` y los tipos; la segunda, las funciones; la tercera, RLS.
