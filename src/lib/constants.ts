export const APP_NAME = "Botica";
export const CURRENCY_CODE = "COP";
export const STORE_TIMEZONE = "America/Bogota";
export const LOCALE = "es-CO";

export const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
} as const;

export const SALE_STATUS_LABELS = {
  completed: "Completada",
  voided: "Anulada",
} as const;

export const MOVEMENT_TYPE_LABELS = {
  entry: "Entrada",
  adjustment: "Ajuste",
  sale: "Venta",
  void: "Anulación",
  expiry: "Baja",
} as const;

export const ROLE_LABELS = {
  admin: "Administrador",
  seller: "Vendedor",
  inventory: "Inventario",
} as const;

export const NAV_ITEMS = [
  {
    href: "/",
    label: "Resumen",
    icon: "dashboard",
  },
  {
    href: "/pos",
    label: "Punto de venta",
    icon: "pos",
  },
  {
    href: "/productos",
    label: "Productos",
    icon: "products",
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: "inventory",
  },
  {
    href: "/ventas",
    label: "Ventas",
    icon: "sales",
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: "users",
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: "settings",
  },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
