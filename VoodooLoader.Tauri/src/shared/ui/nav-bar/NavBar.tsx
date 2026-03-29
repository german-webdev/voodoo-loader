import type { HTMLAttributes } from "react";

type NavBarProps = HTMLAttributes<HTMLElement>;

export function NavBar({ className = "", ...props }: NavBarProps) {
  return <nav {...props} className={className} />;
}
