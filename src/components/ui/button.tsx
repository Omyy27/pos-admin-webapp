import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "soft";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[0_8px_20px_-10px_rgba(15,73,57,0.75)] hover:bg-brand-deep",
  secondary:
    "bg-brand-deep text-white hover:bg-[#0b3b2e]",
  outline:
    "border border-line bg-surface-strong text-ink hover:border-brand/40 hover:bg-brand-soft/50",
  ghost: "text-ink hover:bg-brand-soft/70",
  danger: "bg-danger text-white hover:bg-[#962f28]",
  soft: "bg-brand-soft text-brand-deep hover:bg-mint",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-[10px] px-3 text-xs font-bold",
  md: "h-11 gap-2 rounded-xl px-4 text-sm font-bold",
  lg: "h-12 gap-2 rounded-xl px-5 text-sm font-bold",
  icon: "size-10 rounded-xl",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
