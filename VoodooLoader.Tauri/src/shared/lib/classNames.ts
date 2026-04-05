export type ClassInput = string | null | undefined | false;
export type BemModValue = boolean | string | number | null | undefined;
export type BemMods = Record<string, BemModValue>;
export type CssModuleMap = Record<string, string>;

function resolveCssModuleClass(styles: CssModuleMap, className: string): string {
  return styles[className] ?? className;
}

export function cx(...classes: ClassInput[]): string {
  return classes.filter(Boolean).join(" ");
}

export function bem(
  styles: CssModuleMap,
  base: string,
  mods: BemMods = {},
  extra: ClassInput[] = [],
): string {
  const resolvedClasses: ClassInput[] = [resolveCssModuleClass(styles, base)];

  Object.entries(mods).forEach(([name, value]) => {
    if (!value) {
      return;
    }

    const modifierClass =
      value === true ? `${base}--${name}` : `${base}--${name}-${String(value)}`;
    resolvedClasses.push(resolveCssModuleClass(styles, modifierClass));
  });

  extra.forEach((className) => {
    if (!className) {
      return;
    }
    resolvedClasses.push(resolveCssModuleClass(styles, className));
  });

  return cx(...resolvedClasses);
}
