import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useRef } from "react";
import type * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  applyPreset,
} from "../../../features/settings/model/config";
import { formatMb, parseSizeToMb, clampNonNegative } from "../../../shared/lib/numbers";
import { joinWindowsPath } from "../../../shared/lib/paths";
import { downloaderActions, type DownloaderState } from "./store/downloaderSlice";
import type {
  ContextMenuState,
  MenuName,
  PersistedUiSettings,
  PreviewCommandInput,
  ProgressStats,
  QueuePriority,
  QueueSnapshot,
  QueueSortBy,
  SettingsState,
} from "../../../entities/queue/model/types";

export interface DownloaderPageController {
  urlInput: string;
  destination: string;
  fileName: string;
  settings: SettingsState;
  settingsDraft: SettingsState | null;
  snapshot: QueueSnapshot;
  actionError: string | null;
  previewCommand: string;
  activeMenu: MenuName | null;
  showLogs: boolean;
  showProgressDetails: boolean;
  showAboutDialog: boolean;
  queuePanelHeight: number;
  logsPanelHeight: number;
  draggedItemId: string | null;
  contextMenu: ContextMenuState;
  selectedCount: number;
  progressStats: ProgressStats;
  dialogSettings: SettingsState | null;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  menuHostRef: React.RefObject<HTMLElement | null>;
  queuePanelRef: React.RefObject<HTMLDivElement | null>;
  logsPanelRef: React.RefObject<HTMLDivElement | null>;
  setUrlInput: (value: string) => void;
  setDestination: (value: string) => void;
  setFileName: (value: string) => void;
  setShowLogs: React.Dispatch<React.SetStateAction<boolean>>;
  setShowProgressDetails: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAboutDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setActionError: React.Dispatch<React.SetStateAction<string | null>>;
  setDraggedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;
  applySettingsDialog: () => void;
  updateDraft: (patch: Partial<SettingsState>) => void;
  toggleMenu: (menu: MenuName) => void;
  closeMenus: () => void;
  updatePanelHeights: () => void;
  onQueueContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onRowContextMenu: (event: React.MouseEvent<HTMLElement>, itemId: string) => Promise<void>;
  addToQueue: () => Promise<void>;
  importFromTxtFile: () => Promise<void>;
  onImportFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  startQueue: () => Promise<void>;
  pauseQueue: () => Promise<void>;
  stopQueue: () => Promise<void>;
  clearLogs: () => Promise<void>;
  clearQueue: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  retryFailed: () => Promise<void>;
  removeFailed: () => Promise<void>;
  setItemPriority: (id: string, priority: QueuePriority) => Promise<void>;
  setSelectedPriority: (priority: QueuePriority) => Promise<void>;
  sortQueue: (sortBy: QueueSortBy) => Promise<void>;
  setItemSelected: (id: string, selected: boolean) => Promise<void>;
  setAllSelected: (selected: boolean) => Promise<void>;
  removeSelected: () => Promise<void>;
  retrySelected: () => Promise<void>;
  reorderItemsByDrag: (draggedId: string, targetId: string) => Promise<void>;
  openSelectedFile: () => Promise<void>;
  openSelectedFolder: () => Promise<void>;
  previewCurrentCommand: () => Promise<void>;
  pasteFromClipboard: () => Promise<void>;
  browseDestinationFolder: () => Promise<void>;
  browseCustomAria2Path: () => Promise<void>;
  exitApp: () => Promise<void>;
}

function resolveStateAction<T>(valueOrUpdater: React.SetStateAction<T>, current: T): T {
  if (typeof valueOrUpdater === "function") {
    return (valueOrUpdater as (prev: T) => T)(current);
  }
  return valueOrUpdater;
}

export function useDownloaderPage(): DownloaderPageController {
  const dispatch = useDispatch();
  const state = useSelector((rootState: { downloader: DownloaderState }) => rootState.downloader);

  const {
    urlInput,
    destination,
    fileName,
    settings,
    settingsDraft,
    snapshot,
    actionError,
    previewCommand,
    activeMenu,
    showLogs,
    showProgressDetails,
    showAboutDialog,
    queuePanelHeight,
    logsPanelHeight,
    draggedItemId,
    contextMenu,
  } = state;

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const menuHostRef = useRef<HTMLElement | null>(null);
  const queuePanelRef = useRef<HTMLDivElement | null>(null);
  const logsPanelRef = useRef<HTMLDivElement | null>(null);

  const setUrlInput = (value: string) => dispatch(downloaderActions.setUrlInput(value));
  const setDestination = (value: string) => dispatch(downloaderActions.setDestination(value));
  const setFileName = (value: string) => dispatch(downloaderActions.setFileName(value));

  const setShowLogs: React.Dispatch<React.SetStateAction<boolean>> = (valueOrUpdater) => {
    dispatch(downloaderActions.setShowLogs(resolveStateAction(valueOrUpdater, showLogs)));
  };

  const setShowProgressDetails: React.Dispatch<React.SetStateAction<boolean>> = (
    valueOrUpdater,
  ) => {
    dispatch(
      downloaderActions.setShowProgressDetails(
        resolveStateAction(valueOrUpdater, showProgressDetails),
      ),
    );
  };

  const setShowAboutDialog: React.Dispatch<React.SetStateAction<boolean>> = (valueOrUpdater) => {
    dispatch(
      downloaderActions.setShowAboutDialog(resolveStateAction(valueOrUpdater, showAboutDialog)),
    );
  };

  const setActionError: React.Dispatch<React.SetStateAction<string | null>> = (valueOrUpdater) => {
    dispatch(downloaderActions.setActionError(resolveStateAction(valueOrUpdater, actionError)));
  };

  const setDraggedItemId: React.Dispatch<React.SetStateAction<string | null>> = (
    valueOrUpdater,
  ) => {
    dispatch(downloaderActions.setDraggedItemId(resolveStateAction(valueOrUpdater, draggedItemId)));
  };

  const setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>> = (
    valueOrUpdater,
  ) => {
    dispatch(downloaderActions.setContextMenu(resolveStateAction(valueOrUpdater, contextMenu)));
  };

  const setSettings: React.Dispatch<React.SetStateAction<SettingsState>> = (valueOrUpdater) => {
    dispatch(downloaderActions.setSettings(resolveStateAction(valueOrUpdater, settings)));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw) as Partial<PersistedUiSettings>;

      if (stored.destination) dispatch(downloaderActions.setDestination(stored.destination));
      if (typeof stored.showLogs === "boolean")
        dispatch(downloaderActions.setShowLogs(stored.showLogs));
      if (typeof stored.showProgressDetails === "boolean") {
        dispatch(downloaderActions.setShowProgressDetails(stored.showProgressDetails));
      }
      if (typeof stored.queuePanelHeight === "number") {
        dispatch(downloaderActions.setQueuePanelHeight(Math.max(160, stored.queuePanelHeight)));
      }
      if (typeof stored.logsPanelHeight === "number") {
        dispatch(downloaderActions.setLogsPanelHeight(Math.max(90, stored.logsPanelHeight)));
      }
      if (stored.settings) {
        dispatch(downloaderActions.setSettings({ ...DEFAULT_SETTINGS, ...stored.settings }));
      }
    } catch {
      // Ignore malformed storage.
    }
  }, [dispatch]);

  useEffect(() => {
    const persisted: PersistedUiSettings = {
      destination,
      showLogs,
      showProgressDetails,
      queuePanelHeight,
      logsPanelHeight,
      settings: {
        speedPreset: settings.speedPreset,
        connections: settings.connections,
        splits: settings.splits,
        chunkSize: settings.chunkSize,
        continueDownload: settings.continueDownload,
        userAgent: settings.userAgent,
        maxConnectionsPerServer: settings.maxConnectionsPerServer,
        maxSimultaneousDownloads: settings.maxSimultaneousDownloads,
        autoProvisionAria2: settings.autoProvisionAria2,
        customAria2Path: settings.customAria2Path,
        authMode: settings.authMode,
        username: settings.username,
        language: settings.language,
      },
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
  }, [destination, showLogs, showProgressDetails, queuePanelHeight, logsPanelHeight, settings]);

  useEffect(() => {
    let isMounted = true;
    let unlisten: UnlistenFn | null = null;

    async function bootstrap() {
      try {
        const initial = await invoke<QueueSnapshot>("queue_snapshot");
        if (isMounted) dispatch(downloaderActions.setSnapshot(initial));
      } catch (error) {
        if (isMounted)
          dispatch(downloaderActions.setActionError(`Backend unavailable: ${String(error)}`));
      }

      try {
        unlisten = await listen<QueueSnapshot>("queue://snapshot", (event) => {
          if (isMounted) dispatch(downloaderActions.setSnapshot(event.payload));
        });
      } catch (error) {
        if (isMounted) {
          dispatch(downloaderActions.setActionError(`Event bridge unavailable: ${String(error)}`));
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
      if (unlisten) void unlisten();
    };
  }, [dispatch]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuHostRef.current && !menuHostRef.current.contains(event.target as Node)) {
        dispatch(downloaderActions.setActiveMenu(null));
      }
      if (contextMenu.visible) {
        dispatch(downloaderActions.setContextMenu({ ...contextMenu, visible: false }));
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dispatch, contextMenu]);

  const selectedCount = useMemo(
    () => snapshot.items.filter((item) => item.selected).length,
    [snapshot.items],
  );

  const progressStats = useMemo<ProgressStats>(() => {
    const queued = snapshot.items.filter((item) => item.status.toLowerCase() === "queued").length;
    const downloading = snapshot.items.filter(
      (item) => item.status.toLowerCase() === "downloading",
    ).length;
    const completed = snapshot.items.filter(
      (item) => item.status.toLowerCase() === "completed",
    ).length;
    const failed = snapshot.items.filter((item) => item.status.toLowerCase() === "failed").length;

    const totalMb = snapshot.items.reduce((acc, item) => acc + parseSizeToMb(item.totalSize), 0);
    const downloadedMb = snapshot.items.reduce(
      (acc, item) =>
        acc + (parseSizeToMb(item.totalSize) * Math.max(0, Math.min(100, item.progress))) / 100,
      0,
    );

    const remainingMb = Math.max(0, totalMb - downloadedMb);
    const active =
      snapshot.items.find((item) => item.status.toLowerCase() === "downloading") ?? null;
    const progressPercent = totalMb > 0 ? (downloadedMb / totalMb) * 100 : 0;

    return {
      queued,
      downloading,
      completed,
      failed,
      totalMb,
      downloadedMb,
      remainingMb,
      active,
      progressPercent,
    };
  }, [snapshot.items]);

  async function runAction(action: () => Promise<void>) {
    dispatch(downloaderActions.setActionError(null));
    try {
      await action();
    } catch (error) {
      dispatch(downloaderActions.setActionError(String(error)));
    }
  }

  function openSettingsDialog() {
    dispatch(downloaderActions.setSettingsDraft({ ...settings }));
    dispatch(downloaderActions.setActiveMenu(null));
  }

  function closeSettingsDialog() {
    dispatch(downloaderActions.setSettingsDraft(null));
  }

  function applySettingsDialog() {
    if (!settingsDraft) return;

    dispatch(
      downloaderActions.setSettings({
        ...settingsDraft,
        connections: Math.max(1, clampNonNegative(settingsDraft.connections, 16)),
        splits: Math.max(1, clampNonNegative(settingsDraft.splits, 16)),
        maxConnectionsPerServer: clampNonNegative(settingsDraft.maxConnectionsPerServer, 0),
        maxSimultaneousDownloads: clampNonNegative(settingsDraft.maxSimultaneousDownloads, 0),
        chunkSize: settingsDraft.chunkSize.trim() || "1M",
        userAgent: settingsDraft.userAgent.trim() || "Mozilla/5.0",
      }),
    );
    dispatch(downloaderActions.setSettingsDraft(null));
  }

  function updateDraft(patch: Partial<SettingsState>) {
    dispatch(downloaderActions.patchSettingsDraft(patch));
  }

  function toggleMenu(menu: MenuName) {
    dispatch(downloaderActions.setContextMenu({ ...contextMenu, visible: false }));
    dispatch(downloaderActions.setActiveMenu(activeMenu === menu ? null : menu));
  }

  function closeMenus() {
    dispatch(downloaderActions.setActiveMenu(null));
  }

  function updatePanelHeights() {
    if (queuePanelRef.current) {
      dispatch(
        downloaderActions.setQueuePanelHeight(Math.max(160, queuePanelRef.current.offsetHeight)),
      );
    }
    if (logsPanelRef.current) {
      dispatch(
        downloaderActions.setLogsPanelHeight(Math.max(90, logsPanelRef.current.offsetHeight)),
      );
    }
  }

  function onQueueContextMenu(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    dispatch(downloaderActions.setActiveMenu(null));
    dispatch(
      downloaderActions.setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }

  async function onRowContextMenu(event: React.MouseEvent<HTMLElement>, itemId: string) {
    event.preventDefault();
    await runAction(async () => {
      const clear = await invoke<QueueSnapshot>("set_all_queue_items_selected", {
        selected: false,
      });
      dispatch(downloaderActions.setSnapshot(clear));

      const next = await invoke<QueueSnapshot>("set_queue_item_selected", {
        id: itemId,
        selected: true,
      });
      dispatch(downloaderActions.setSnapshot(next));
    });

    dispatch(downloaderActions.setActiveMenu(null));
    dispatch(
      downloaderActions.setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }

  async function addToQueue() {
    if (!urlInput.trim()) {
      dispatch(downloaderActions.setActionError("URL is required."));
      return;
    }

    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("add_queue_item", {
        url: urlInput,
        destination,
        fileName: fileName.trim() || null,
      });
      dispatch(downloaderActions.setSnapshot(next));
      dispatch(downloaderActions.setUrlInput(""));
      dispatch(downloaderActions.setFileName(""));
    });
  }

  async function importFromText(text: string) {
    if (!text.trim()) {
      dispatch(downloaderActions.setActionError("Import text is empty."));
      return;
    }

    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("add_queue_items_from_text", { text, destination });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function importFromTxtFile() {
    importInputRef.current?.click();
    dispatch(downloaderActions.setActiveMenu(null));
  }

  async function onImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const text = await file.text();
    await importFromText(text);
  }

  async function startQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("start_queue", {
        maxSimultaneousDownloads: settings.maxSimultaneousDownloads,
      });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function pauseQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("pause_queue");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function stopQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("stop_queue");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function clearLogs() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("clear_logs");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function clearQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("clear_queue");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function removeItem(id: string) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("remove_queue_item", { id });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function retryItem(id: string) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("retry_queue_item", { id });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function retryFailed() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("retry_failed_items");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function removeFailed() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("remove_failed_items");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function setItemPriority(id: string, priority: QueuePriority) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("set_queue_item_priority", { id, priority });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function setSelectedPriority(priority: QueuePriority) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("set_selected_items_priority", { priority });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function sortQueue(sortBy: QueueSortBy) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("sort_queue", { sortBy });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function setItemSelected(id: string, selected: boolean) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("set_queue_item_selected", { id, selected });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function setAllSelected(selected: boolean) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("set_all_queue_items_selected", { selected });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function removeSelected() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("remove_selected_items");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function retrySelected() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("retry_selected_items");
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function reorderItemsByDrag(draggedId: string, targetId: string) {
    if (!draggedId || !targetId || draggedId === targetId) return;

    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("reorder_queue_item", { draggedId, targetId });
      dispatch(downloaderActions.setSnapshot(next));
    });
  }

  async function openSelectedFile() {
    const target = snapshot.items.find(
      (item) => item.selected && item.status.toLowerCase() === "completed",
    );
    if (!target) {
      dispatch(downloaderActions.setActionError("Select one completed item first."));
      return;
    }

    await runAction(async () => {
      await openPath(joinWindowsPath(target.destination, target.fileName));
    });
  }

  async function openSelectedFolder() {
    const target = snapshot.items.find((item) => item.selected) ?? snapshot.items[0];
    if (!target) {
      dispatch(downloaderActions.setActionError("No queue item available."));
      return;
    }

    await runAction(async () => {
      await revealItemInDir(target.destination);
    });
  }

  async function previewCurrentCommand() {
    const effectiveUrl =
      urlInput.trim() || progressStats.active?.url || snapshot.items[0]?.url || "";
    if (!effectiveUrl) {
      dispatch(downloaderActions.setActionError("URL is required for command preview."));
      return;
    }

    await runAction(async () => {
      const input: PreviewCommandInput = {
        url: effectiveUrl,
        destination,
        fileName: fileName.trim() || null,
        authMode: settings.authMode,
        token: settings.token.trim() || null,
        username: settings.username.trim() || null,
        password: settings.password.trim() || null,
        extraHeaders: settings.extraHeaders.trim() || null,
        continueDownload: settings.continueDownload,
        maxConnections: settings.maxConnectionsPerServer,
        connections: settings.connections,
        splits: settings.splits,
        chunkSize: settings.chunkSize.trim() || null,
        userAgent: settings.userAgent.trim() || null,
      };

      const cmd = await invoke<string>("build_preview_command", { input });
      dispatch(downloaderActions.setPreviewCommand(cmd));
    });
  }

  async function pasteFromClipboard() {
    await runAction(async () => {
      const text = await navigator.clipboard.readText();
      dispatch(downloaderActions.setUrlInput(text?.trim() || ""));
    });
  }

  async function browseDestinationFolder() {
    await runAction(async () => {
      const selected = await invoke<string | null>("pick_folder");
      if (selected) dispatch(downloaderActions.setDestination(selected));
    });
  }

  async function browseCustomAria2Path() {
    await runAction(async () => {
      const selected = await invoke<string | null>("pick_file");
      if (selected && settingsDraft) {
        dispatch(downloaderActions.patchSettingsDraft({ customAria2Path: selected }));
      }
    });
  }

  async function exitApp() {
    await runAction(async () => {
      await getCurrentWindow().close();
    });
  }

  return {
    urlInput,
    destination,
    fileName,
    settings,
    settingsDraft,
    snapshot,
    actionError,
    previewCommand,
    activeMenu,
    showLogs,
    showProgressDetails,
    showAboutDialog,
    queuePanelHeight,
    logsPanelHeight,
    draggedItemId,
    contextMenu,
    selectedCount,
    progressStats,
    dialogSettings: settingsDraft,
    importInputRef,
    menuHostRef,
    queuePanelRef,
    logsPanelRef,
    setUrlInput,
    setDestination,
    setFileName,
    setShowLogs,
    setShowProgressDetails,
    setShowAboutDialog,
    setActionError,
    setDraggedItemId,
    setContextMenu,
    setSettings,
    openSettingsDialog,
    closeSettingsDialog,
    applySettingsDialog,
    updateDraft,
    toggleMenu,
    closeMenus,
    updatePanelHeights,
    onQueueContextMenu,
    onRowContextMenu,
    addToQueue,
    importFromTxtFile,
    onImportFileChange,
    startQueue,
    pauseQueue,
    stopQueue,
    clearLogs,
    clearQueue,
    removeItem,
    retryItem,
    retryFailed,
    removeFailed,
    setItemPriority,
    setSelectedPriority,
    sortQueue,
    setItemSelected,
    setAllSelected,
    removeSelected,
    retrySelected,
    reorderItemsByDrag,
    openSelectedFile,
    openSelectedFolder,
    previewCurrentCommand,
    pasteFromClipboard,
    browseDestinationFolder,
    browseCustomAria2Path,
    exitApp,
  };
}

export { formatMb, applyPreset, clampNonNegative };
