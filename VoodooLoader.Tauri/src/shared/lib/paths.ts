export function joinWindowsPath(dir: string, file: string): string {
  const base = dir.trim().replace(/[\\/]+$/, "");
  return `${base}\\${file.trim()}`;
}
