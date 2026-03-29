import { createElement, type HTMLAttributes } from "react";
import styles from "./Title.module.css";

type TitleTag = "h1" | "h2" | "h3" | "h4";
type TitleTypography = "page" | "section" | "subsection";

interface TitleProps extends HTMLAttributes<HTMLElement> {
  as?: TitleTag;
  typography?: TitleTypography;
}

const typographyClassMap: Record<TitleTypography, string> = {
  page: styles.page || "page",
  section: styles.section || "section",
  subsection: styles.subsection || "subsection",
};

export function Title({
  as = "h2",
  typography = "section",
  className = "",
  children,
  ...props
}: TitleProps) {
  const resolvedClassName = [styles.title || "title", typographyClassMap[typography], className]
    .filter(Boolean)
    .join(" ");

  return createElement(as, { ...props, className: resolvedClassName }, children);
}
