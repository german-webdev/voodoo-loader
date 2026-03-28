export type QueueStatus = "Queued" | "Downloading" | "Completed" | "Failed" | "Canceled" | string;
export type AuthMode = "none" | "token" | "basic";
export type Language = "en" | "ru";
export type MenuName = "file" | "downloads" | "view" | "settings" | "help";
export type QueueSortBy = "added" | "extension" | "priority";
export type QueuePriority = "High" | "Medium" | "Low";

export interface QueueItem {
  id: string;
  selected: boolean;
  fileName: string;
  url: string;
  destination: string;
  status: QueueStatus;
  progress: number;
  speed: string;
  eta: string;
  totalSize: string;
  priority: string;
  attempts: number;
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export interface QueueSnapshot {
  isRunning: boolean;
  items: QueueItem[];
  logs: LogEntry[];
}

export interface SettingsState {
  speedPreset: string;
  connections: number;
  splits: number;
  chunkSize: string;
  continueDownload: boolean;
  userAgent: string;
  maxConnectionsPerServer: number;
  maxSimultaneousDownloads: number;
  autoProvisionAria2: boolean;
  customAria2Path: string;
  authMode: AuthMode;
  token: string;
  username: string;
  password: string;
  extraHeaders: string;
  language: Language;
}

export interface PreviewCommandInput {
  url: string;
  destination: string;
  fileName?: string | null;
  authMode: AuthMode;
  token?: string | null;
  username?: string | null;
  password?: string | null;
  extraHeaders?: string | null;
  continueDownload: boolean;
  maxConnections: number;
  connections: number;
  splits: number;
  chunkSize?: string | null;
  userAgent?: string | null;
}

export interface PersistedUiSettings {
  destination: string;
  showLogs: boolean;
  showProgressDetails: boolean;
  queuePanelHeight: number;
  logsPanelHeight: number;
  settings: Omit<SettingsState, "token" | "password" | "extraHeaders">;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export interface ProgressStats {
  queued: number;
  downloading: number;
  completed: number;
  failed: number;
  totalMb: number;
  downloadedMb: number;
  remainingMb: number;
  active: QueueItem | null;
  progressPercent: number;
}
