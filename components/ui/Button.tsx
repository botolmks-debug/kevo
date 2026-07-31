import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "cta";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary-hover",
  secondary: "border border-primary/30 bg-white text-primary hover:bg-primary/5",
  cta: "bg-accent text-white shadow-sm shadow-accent/25 hover:brightness-95",
};

export function buttonClassName(variant: ButtonVariant = "primary", className = ""): string {
  return [base, variants[variant], className].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
};

export function LinkButton({ href, variant = "primary", className, children, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClassName(variant, className)} {...props}>
      {children}
    </Link>
  );
}