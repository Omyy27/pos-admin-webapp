import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  CURRENCY_CODE,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
  STORE_TIMEZONE,
} from "@/lib/constants";

export function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  const hasCents = Math.abs(amount % 1) > 0.004;

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("es-CO").format(Number(value ?? 0));
}

export function formatDateTime(
  value: string | Date,
  timeZone = STORE_TIMEZONE,
): string {
  return formatInTimeZone(
    value,
    timeZone,
    "d MMM yyyy, h:mm a",
    { locale: es },
  );
}

export function formatDateShort(
  value: string | Date,
  timeZone = STORE_TIMEZONE,
): string {
  return formatInTimeZone(value, timeZone, "d MMM yyyy", { locale: es });
}

export function formatDateOnly(value: string | null): string {
  if (!value) return "Sin caducidad";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function todayInBogota(timeZone = STORE_TIMEZONE): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}

export function getDayRange(
  date = new Date(),
  timeZone = STORE_TIMEZONE,
): { start: string; end: string } {
  const zonedDate = toZonedTime(date, timeZone);

  return {
    start: fromZonedTime(startOfDay(zonedDate), timeZone).toISOString(),
    end: fromZonedTime(endOfDay(zonedDate), timeZone).toISOString(),
  };
}

export function getPeriodRange(
  period: "today" | "week" | "month" | "all",
  timeZone = STORE_TIMEZONE,
): { start: string | null; end: string } {
  const now = new Date();
  const zonedNow = toZonedTime(now, timeZone);
  const end = fromZonedTime(endOfDay(zonedNow), timeZone).toISOString();

  if (period === "all") {
    return { start: null, end };
  }

  const startZoned =
    period === "today"
      ? startOfDay(zonedNow)
      : period === "week"
        ? startOfWeek(zonedNow, { weekStartsOn: 1 })
        : startOfMonth(zonedNow);

  return {
    start: fromZonedTime(startZoned, timeZone).toISOString(),
    end,
  };
}

export function daysUntil(dateOnly: string | null): number | null {
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day));
  const today = new Date(`${todayInBogota()}T00:00:00.000Z`);

  return differenceInCalendarDays(target, today);
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = addDays(new Date(Date.UTC(year, month - 1, day)), days);
  return date.toISOString().slice(0, 10);
}

export function isExpired(dateOnly: string | null): boolean {
  if (!dateOnly) return false;
  const days = daysUntil(dateOnly);
  return days !== null && days < 0;
}

export function expiryTone(
  dateOnly: string | null,
  alertDays: number,
): "expired" | "soon" | "ok" | "none" {
  if (!dateOnly) return "none";
  const days = daysUntil(dateOnly);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= alertDays) return "soon";
  return "ok";
}

export function paymentLabel(method: keyof typeof PAYMENT_METHOD_LABELS): string {
  return PAYMENT_METHOD_LABELS[method];
}

export function saleStatusLabel(status: keyof typeof SALE_STATUS_LABELS): string {
  return SALE_STATUS_LABELS[status];
}

export function movementLabel(type: keyof typeof MOVEMENT_TYPE_LABELS): string {
  return MOVEMENT_TYPE_LABELS[type];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "equipo";
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}
