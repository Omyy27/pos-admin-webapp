import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { AppShell, type ShellNavItem } from "@/components/layout/app-shell";
import { getAuthState } from "@/lib/auth/context";
import { logoutAction } from "@/lib/auth/actions";
import { formatDateShort } from "@/lib/format";
import { NAV_ITEMS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const state = await getAuthState();

  if (state.status === "unconfigured") {
    redirect("/login?setup=1");
  }

  if (state.status === "anonymous") {
    redirect("/login");
  }

  if (state.status === "inactive") {
    return (
      <main className="bg-grain flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[26px] border border-line bg-surface p-8 text-center shadow-[0_24px_80px_-48px_rgba(23,52,43,0.5)]">
          <div className="mx-auto mb-5 flex justify-center">
            <BrandMark className="size-12" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            Acceso suspendido
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-ink">
            Tu cuenta está inactiva
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {state.user.email
              ? `La cuenta ${state.user.email} no tiene acceso en este momento.`
              : "Esta cuenta no tiene acceso en este momento."}{" "}
            Comunícate con un administrador para que habilite tu usuario.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-deep"
              >
                Cerrar sesión
              </button>
            </form>
            <Link
              href="/login"
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const canSeeSales = state.can("sales.read_all") || state.can("sales.read_own");

  const navItems: ShellNavItem[] = NAV_ITEMS.filter((item) => {
    if (item.href === "/pos") return state.can("sales.create");
    if (item.href === "/productos") return state.can("catalog.read");
    if (item.href === "/inventario") return state.can("inventory.read");
    if (item.href === "/ventas") return canSeeSales;
    if (item.href === "/usuarios") return state.can("users.manage");
    if (item.href === "/configuracion") return state.can("settings.manage");
    return true;
  }).map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
  }));

  return (
    <AppShell
      navItems={navItems}
      storeName={state.settings.store_name}
      userName={state.profile.full_name}
      roleName={state.role.name}
      dateLabel={formatDateShort(new Date(), state.settings.timezone)}
    >
      {children}
    </AppShell>
  );
}
