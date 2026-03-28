import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "mini";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  ghost: "btn btn-ghost",
  mini: "btn btn-mini",
};

export function Button({ variant = "ghost", className = "", ...props }: ButtonProps) {
  const resolvedClassName = `${variantClassMap[variant]} ${className}`.trim();
  return <button {...props} className={resolvedClassName} />;
}
