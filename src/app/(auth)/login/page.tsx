import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Boxes,
  CalendarClock,
  ShieldCheck,
  ScanLine,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/context";
import { logoutAction } from "@/lib/auth/actions";
import { BrandMark } from "@/components/ui/brand-mark";
import { LoginForm } from "./login-form";
import styles from "./login.module.scss";

export const metadata: Metadata = {
  title: "Ingresar",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const state = await getAuthState();

  if (state.status === "authenticated") {
    redirect("/");
  }

  const unconfigured = state.status === "unconfigured";
  const inactive = state.status === "inactive";

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <BrandMark className="size-11" />
          <div>
            <p className={styles.brandName}>Botica</p>
            <p className={styles.brandMeta}>Inventario · Punto de venta</p>
          </div>
        </div>

        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <span className="size-1.5 rounded-full bg-lime" />
            Orden para tu droguería
          </span>
          <h1 className={styles.heroTitle}>
            Cuidar también es <em>organizar.</em>
          </h1>
          <p className={styles.heroText}>
            Inventario por lotes, vencimientos bajo control y ventas ágiles en
            un solo lugar. Todo el equipo sabe qué hay, qué vence y qué se vendió.
          </p>

          <div className={styles.featureList}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>
                <Boxes className="size-4" />
              </span>
              Stock por lote con salida FEFO y trazabilidad completa.
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>
                <CalendarClock className="size-4" />
              </span>
              Alertas de caducidad antes de que sea tarde.
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>
                <ScanLine className="size-4" />
              </span>
              Vende por código de barras desde el mostrador.
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>
                <ShieldCheck className="size-4" />
              </span>
              Roles y permisos para cada persona del equipo.
            </div>
          </div>
        </div>

        <div className={styles.brandFooter}>
          <span>Hecho para operaciones pequeñas, con datos bien cuidados.</span>
          <span>COP · Bogotá</span>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formWrap}>
          <p className={styles.formEyebrow}>Acceso al sistema</p>
          <h2 className={styles.formTitle}>Hola de nuevo.</h2>
          <p className={styles.formSubtitle}>
            Ingresa con tu cuenta para abrir la caja, revisar inventario y
            continuar con la operación del día.
          </p>

          {unconfigured ? (
            <div className={styles.setupBox}>
              <p className={styles.setupTitle}>Falta conectar Supabase</p>
              <p className={styles.setupText}>
                Crea el proyecto en Supabase, aplica las migraciones incluidas
                en <strong>supabase/migrations</strong> y agrega las claves en
                tu archivo <strong>.env.local</strong>.
              </p>
              <code className={styles.setupCode}>{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}</code>
              <p className={styles.setupText}>
                Después reinicia el servidor de desarrollo. Las instrucciones
                completas están en el README del proyecto.
              </p>
            </div>
          ) : inactive ? (
            <>
              <div className={styles.inactiveBox}>
                La cuenta {state.user.email ?? ""} existe, pero está inactiva. Un
                administrador debe habilitarla para que puedas ingresar.
              </div>
              <form action={logoutAction} className="mt-4">
                <button
                  type="submit"
                  className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink hover:bg-canvas"
                >
                  Usar otra cuenta
                </button>
              </form>
            </>
          ) : (
            <LoginForm />
          )}
        </div>
      </section>
    </main>
  );
}
