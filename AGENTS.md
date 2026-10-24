<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Arquitectura

El proyecto usa una organización feature-first sobre App Router:

- `src/app/`: rutas y capa de vistas. Las páginas consultan datos y componen features.
- `src/features/<dominio>/`: `actions.ts`, `schema.ts` y `components/` del dominio (`catalog`, `inventory`, `sales`, `users`, `settings`).
- `src/components/ui/`: design system compartido.
- `src/components/layout/`: shell de la aplicación.
- `src/lib/`: infraestructura transversal (auth, Supabase, formato, validación compartida).
- `src/types/database.ts`: tipos generados de Supabase; no editar a mano.

Reglas de dependencia:

- `app` puede importar de `features`, `components` y `lib`.
- `features/*` puede importar de `lib`, `components/ui` y `types`; nunca de otra feature.
- `components/ui` y `components/layout` no importan features.
- No usar barrels (`index.ts`): los módulos `"use server"` solo exportan funciones async y los barrels arrastran código al cliente.
