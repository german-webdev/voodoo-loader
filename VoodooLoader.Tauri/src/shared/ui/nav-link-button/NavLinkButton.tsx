import type { ButtonHTMLAttributes } from "react";
import styles from "./NavLinkButton.module.css";

type NavLinkButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function NavLinkButton({ className = "", ...props }: NavLinkButtonProps) {
  const resolvedClassName = [styles.navLinkButton || "navLinkButton", className]
    .filter(Boolean)
    .join(" ");

  return <button {...props} className={resolvedClassName} />;
}
