export function clampNonNegative(value: number, fallback = 0): number {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

export function parseSizeToMb(size: string): number {
  const normalized = size.trim().toLowerCase();
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return 0;

  if (normalized.includes("gb")) return value * 1024;
  if (normalized.includes("mb")) return value;
  if (normalized.includes("kb")) return value / 1024;

  return 0;
}

export function formatMb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`;
  return `${value.toFixed(0)} MB`;
}
