import type { ButtonHTMLAttributes } from "react";
import { cx } from "../../lib/classNames";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "ghost" | "mini";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: styles.primary || "primary",
  ghost: styles.ghost || "ghost",
  mini: styles.mini || "mini",
};

export function Button({ variant = "ghost", className = "", ...props }: ButtonProps) {
  const resolvedClassName = cx(styles.button || "button", variantClassMap[variant], className);
  return <button {...props} className={resolvedClassName} />;
}
