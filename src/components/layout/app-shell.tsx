'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";
import type { NavIcon } from "@/lib/constants";
import { initials } from "@/lib/format";
import styles from "./app-shell.module.scss";

const icons: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ScanLine,
  products: PackageSearch,
  inventory: Boxes,
  sales: ReceiptText,
  users: Users,
  settings: Settings,
};

export type ShellNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export function AppShell({
  children,
  navItems,
  storeName,
  userName,
  roleName,
  dateLabel,
}: {
  children: React.ReactNode;
  navItems: ShellNavItem[];
  storeName: string;
  userName: string;
  roleName: string;
  dateLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <>
      <div className={styles.brandRow}>
        <BrandMark className="size-11" />
        <div className="min-w-0">
          <p className="font-display text-[1.35rem] font-semibold leading-none text-white">
            Botica
          </p>
          <p className={styles.storeName}>{storeName}</p>
        </div>
      </div>

      <div className={styles.workspacePill}>
        <span className="size-2 rounded-full bg-lime shadow-[0_0_0_4px_rgba(217,239,132,0.14)]" />
        <span className="truncate">Operación activa</span>
        <span className={styles.currency}>COP</span>
      </div>

      <nav className={styles.nav} aria-label="Navegación principal">
        <p className={styles.navEyebrow}>Menú</p>
        {navItems.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(styles.navLink, active && styles.navLinkActive)}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {active ? <span className={styles.activeDot} /> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.helperCard}>
          <ShieldCheck className="size-5 text-lime" />
          <p>
            Cada movimiento de inventario queda auditado y asociado a tu usuario.
          </p>
        </div>

        <div className={styles.userCard}>
          <div className={styles.avatar}>{initials(userName)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{userName}</p>
            <p className="truncate text-[11px] font-medium text-white/55">
              {roleName}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className={styles.logoutButton}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.shell}>
      <div className={styles.desktopSidebar}>
        <aside className={styles.sidebar}>{nav}</aside>
      </div>

      <div
        className={cn(styles.mobileOverlay, mobileOpen && styles.mobileOverlayOpen)}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(styles.mobileDrawer, mobileOpen && styles.mobileDrawerOpen)}
        aria-label="Menú móvil"
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={styles.mobileClose}
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </button>
        {nav}
      </aside>

      <div className={styles.contentColumn}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-8" />
            <span className="font-display text-lg font-semibold text-ink">Botica</span>
          </div>

          <div className={styles.topbarDate}>
            <span className={styles.topbarDot} />
            {dateLabel}
          </div>

          <div className={styles.topbarUser}>
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-bold text-ink">{userName}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {roleName}
              </span>
            </span>
            <span className={styles.topbarAvatar}>{initials(userName)}</span>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
