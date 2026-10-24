"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Minus,
  PackageX,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import { createSaleAction } from "../actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";
import type { PosProduct } from "../queries";

type SaleSuccess = {
  saleId: string;
  ticketNumber: number;
  total: number;
};

const paymentOptions: {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "cash", label: PAYMENT_METHOD_LABELS.cash, icon: Banknote },
  { value: "card", label: PAYMENT_METHOD_LABELS.card, icon: CreditCard },
  { value: "transfer", label: PAYMENT_METHOD_LABELS.transfer, icon: Wallet },
];

export function PosTerminal({
  products,
  categories,
  pricesIncludeTax,
}: {
  products: PosProduct[];
  categories: string[];
  pricesIncludeTax: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [success, setSuccess] = useState<SaleSuccess | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (category && product.category_name !== category) return false;
      if (!needle) return true;

      return (
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        (product.barcode?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [products, query, category]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((item): item is { product: PosProduct; quantity: number } =>
          Boolean(item),
        ),
    [cart, products],
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.product.sale_price) * item.quantity,
    0,
  );

  function addProduct(product: PosProduct) {
    const current = cart[product.id] ?? 0;

    if (current >= product.available_quantity) {
      toast.error(
        `No hay más stock vigente de ${product.name}. Disponible: ${formatNumber(product.available_quantity)}.`,
      );
      return;
    }

    setCart((previous) => ({ ...previous, [product.id]: current + 1 }));
  }

  function changeQuantity(productId: string, delta: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setCart((previous) => {
      const next = { ...previous };
      const value = (next[productId] ?? 0) + delta;

      if (value <= 0) {
        delete next[productId];
        return next;
      }

      if (value > product.available_quantity) {
        toast.error(
          `Solo hay ${formatNumber(product.available_quantity)} unidades disponibles de ${product.name}.`,
        );
        return previous;
      }

      next[productId] = value;
      return next;
    });
  }

  function removeProduct(productId: string) {
    setCart((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
  }

  function clearCart() {
    setCart({});
  }

  function handleSearchSubmit() {
    const needle = query.trim().toLowerCase();
    if (!needle) return;

    const exact = products.find(
      (product) =>
        product.barcode?.toLowerCase() === needle ||
        product.sku.toLowerCase() === needle,
    );

    if (exact) {
      if (exact.available_quantity > 0) {
        addProduct(exact);
        setQuery("");
      } else {
        toast.error(`${exact.name} no tiene stock vigente.`);
      }
      return;
    }

    if (filteredProducts.length === 1) {
      const only = filteredProducts[0];
      if (only.available_quantity > 0) {
        addProduct(only);
        setQuery("");
      } else {
        toast.error(`${only.name} no tiene stock vigente.`);
      }
      return;
    }

    if (filteredProducts.length === 0) {
      toast.error("No encontramos un producto con ese nombre, SKU o código.");
    }
  }

  function confirmSale() {
    if (cartItems.length === 0) return;

    startTransition(async () => {
      const result = await createSaleAction({
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod: payment,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const data = result.data;
      if (!data) {
        toast.error("La venta se registró, pero no recibimos el comprobante.");
        return;
      }

      setCheckoutOpen(false);
      setCart({});
      setSuccess(data);
      toast.success(`Venta #${data.ticketNumber} registrada.`);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/60" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                placeholder="Buscar producto o escanear código de barras…"
                className="h-12 pl-10 pr-24 text-base"
                aria-label="Buscar producto"
                autoFocus
              />
              <span className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-line bg-canvas px-2 py-1 text-[10px] font-bold text-muted">
                <Barcode className="size-3" />
                Enter
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 thin-scrollbar">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                category === ""
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface-strong text-muted hover:border-brand/30 hover:text-ink",
              )}
            >
              Todas
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                  category === name
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface-strong text-muted hover:border-brand/30 hover:text-ink",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-muted">
            {formatNumber(filteredProducts.length)} producto
            {filteredProducts.length === 1 ? "" : "s"} disponible
            {filteredProducts.length === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] font-medium text-muted">
            {pricesIncludeTax ? "Precios con impuesto incluido" : "Precios antes de impuesto"}
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={<PackageX className="size-5" />}
            title="Sin resultados"
            description="No hay productos que coincidan con la búsqueda. Prueba con otro término o revisa el catálogo."
            action={
              <Link
                href="/productos"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                Revisar catálogo
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCart = cart[product.id] ?? 0;
              const outOfStock = product.available_quantity <= 0;
              const atLimit = inCart >= product.available_quantity;

              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-surface p-4 transition",
                    outOfStock
                      ? "border-line/60 opacity-70"
                      : "border-line hover:border-brand/30 hover:shadow-[0_12px_32px_-28px_rgba(23,52,43,0.5)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                      {product.category_name ?? "Sin categoría"}
                    </p>
                    {inCart > 0 ? (
                      <Badge tone="brand">{formatNumber(inCart)} en carrito</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-ink">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </p>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div>
                      <p className="text-base font-extrabold tracking-[-0.02em] text-ink">
                        {formatMoney(product.sale_price)}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] font-semibold",
                          outOfStock
                            ? "text-danger"
                            : product.available_quantity <= 5
                              ? "text-[#8a5a16]"
                              : "text-muted",
                        )}
                      >
                        {outOfStock
                          ? "Sin stock vigente"
                          : `${formatNumber(product.available_quantity)} disponibles`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={atLimit ? "soft" : "primary"}
                      disabled={outOfStock || atLimit}
                      onClick={() => addProduct(product)}
                      aria-label={`Agregar ${product.name}`}
                    >
                      <Plus className="size-4" />
                      Agregar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Card className="h-fit overflow-hidden xl:sticky xl:top-[88px]">
        <div className="flex items-center justify-between gap-2 border-b border-line bg-canvas/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <ShoppingCart className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Carrito</p>
              <p className="text-[10px] text-muted">
                {formatNumber(cartCount)} unidad{cartCount === 1 ? "" : "es"}
              </p>
            </div>
          </div>
          {cartItems.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] font-bold text-muted hover:text-danger"
            >
              Vaciar
            </button>
          ) : null}
        </div>

        {cartItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingCart className="mx-auto size-8 text-muted/30" />
            <p className="mt-3 text-sm font-bold text-ink">El carrito está vacío</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Busca un producto o escanea su código para comenzar.
            </p>
          </div>
        ) : (
          <div className="max-h-[38dvh] divide-y divide-line/70 overflow-y-auto thin-scrollbar">
            {cartItems.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatMoney(product.sale_price)} · {formatNumber(quantity)} u.
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(product.id, -1)}
                      className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface-strong text-ink hover:bg-canvas"
                      aria-label={`Quitar una unidad de ${product.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-extrabold text-ink">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(product.id, 1)}
                      disabled={quantity >= product.available_quantity}
                      className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface-strong text-ink hover:bg-canvas disabled:opacity-40"
                      aria-label={`Agregar una unidad de ${product.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-ink">
                    {formatMoney(Number(product.sale_price) * quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="mt-2 text-muted/50 transition hover:text-danger"
                    aria-label={`Eliminar ${product.name} del carrito`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-line p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
            Método de pago
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPayment(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-bold transition",
                    payment === option.value
                      ? "border-brand bg-brand-soft text-brand-deep"
                      : "border-line bg-surface-strong text-muted hover:border-brand/30",
                  )}
                  aria-pressed={payment === option.value}
                >
                  <Icon className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs font-bold text-muted">Total</span>
            <span className="text-2xl font-extrabold tracking-[-0.04em] text-ink">
              {formatMoney(total)}
            </span>
          </div>

          <Button
            className="mt-3 w-full"
            size="lg"
            disabled={cartItems.length === 0}
            onClick={() => setCheckoutOpen(true)}
          >
            <ReceiptText className="size-4" />
            Cobrar venta
          </Button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
            El stock se descuenta de los lotes vigentes con vencimiento más
            próximo.
          </p>
        </div>
      </Card>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader
            title="Confirmar venta"
            description="Revisa los productos y el método de pago antes de registrar la venta."
          />
          <div className="mt-4 space-y-2 rounded-xl border border-line bg-canvas/50 p-3">
            {cartItems.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {quantity} × {product.name}
                </span>
                <span className="font-bold text-ink">
                  {formatMoney(Number(product.sale_price) * quantity)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-xs font-bold text-muted">
                Total · {PAYMENT_METHOD_LABELS[payment]}
              </span>
              <span className="text-lg font-extrabold text-ink">
                {formatMoney(total)}
              </span>
            </div>
          </div>
          <FormMessage
            message={
              pending
                ? "Registrando la venta, no cierres esta ventana…"
                : undefined
            }
            tone="info"
            className="mt-3"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              disabled={pending}
            >
              Volver al carrito
            </Button>
            <Button
              type="button"
              onClick={confirmSale}
              disabled={pending || cartItems.length === 0}
            >
              <CheckCircle2 className="size-4" />
              {pending ? "Registrando…" : "Confirmar y cobrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={success !== null}
        onOpenChange={(open) => {
          if (!open) setSuccess(null);
        }}
      >
        <DialogContent showClose={false} className="max-w-md text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogHeader
            title="Venta registrada"
            description="El inventario y la caja quedaron actualizados."
            className="mt-4 text-center"
          />
          <div className="mt-5 rounded-2xl border border-line bg-canvas/50 px-5 py-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted">
              Ticket
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              #{success?.ticketNumber}
            </p>
            <p className="mt-2 text-lg font-extrabold text-brand-deep">
              {formatMoney(success?.total ?? 0)}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSuccess(null)}
            >
              Nueva venta
            </Button>
            {success ? (
              <Link
                href={`/ventas/${success.saleId}/ticket`}
                target="_blank"
                className={buttonClasses({ variant: "primary" })}
              >
                <ReceiptText className="size-4" />
                Ver ticket
              </Link>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
