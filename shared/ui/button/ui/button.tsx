import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "solid" | "gold" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  solid: "bg-text text-bg hover:bg-text/90",
  gold: "bg-gold text-bg hover:[background-position:100%_50%] bg-[length:200%_100%] bg-[position:0%_50%] transition-[background-position] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.25)]",
  outline: "border border-line-strong text-text hover:bg-surface/60",
  ghost: "bg-transparent text-text hover:bg-surface/40",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-base",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

export function buttonClassName({
  variant = "solid",
  size = "md",
  block = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium leading-none",
    "transition-colors disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    variantClass[variant],
    sizeClass[size],
    block && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "solid",
    size = "md",
    block = false,
    icon,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClassName({ variant, size, block, className })}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
