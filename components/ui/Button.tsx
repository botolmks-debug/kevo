import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "cta";

const base =
  "inline-flex items-center justify-center rounded-card px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-primary text-primary bg-transparent hover:bg-primary/5",
  cta: "bg-accent text-navy hover:brightness-95",
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
