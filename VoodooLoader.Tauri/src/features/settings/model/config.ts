import type { QueueSnapshot, SettingsState } from "../../../entities/queue/model/types";

export const EMPTY_SNAPSHOT: QueueSnapshot = { isRunning: false, items: [], logs: [] };
export const DEFAULT_DESTINATION = "C:\\Downloads\\VoodooLoader";
export const SETTINGS_KEY = "voodoo-loader-ui-settings-v2";

export const DEFAULT_SETTINGS: SettingsState = {
  speedPreset: "Balanced",
  connections: 16,
  splits: 16,
  chunkSize: "1M",
  continueDownload: true,
  userAgent: "Mozilla/5.0",
  maxConnectionsPerServer: 0,
  maxSimultaneousDownloads: 0,
  autoProvisionAria2: true,
  customAria2Path: "",
  authMode: "none",
  token: "",
  username: "",
  password: "",
  extraHeaders: "",
  language: "en",
};

export const PRESET_MAP: Record<
  string,
  { connections: number; splits: number; chunkSize: string }
> = {
  Safe: { connections: 4, splits: 4, chunkSize: "1M" },
  Balanced: { connections: 16, splits: 16, chunkSize: "1M" },
  Fast: { connections: 24, splits: 24, chunkSize: "1M" },
  Aggressive: { connections: 32, splits: 32, chunkSize: "1M" },
  "Very large files": { connections: 16, splits: 16, chunkSize: "4M" },
  Manual: { connections: 16, splits: 16, chunkSize: "1M" },
};

export function applyPreset(settings: SettingsState, preset: string): SettingsState {
  if (preset === "Manual") return { ...settings, speedPreset: preset };
  const mapped = PRESET_MAP[preset] ?? PRESET_MAP.Balanced;

  return {
    ...settings,
    speedPreset: preset,
    connections: mapped.connections,
    splits: mapped.splits,
    chunkSize: mapped.chunkSize,
  };
}
