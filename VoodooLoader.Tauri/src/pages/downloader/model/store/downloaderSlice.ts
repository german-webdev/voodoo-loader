import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  DEFAULT_DESTINATION,
  DEFAULT_SETTINGS,
  EMPTY_SNAPSHOT,
} from "../../../../features/settings/model/config";
import type {
  ContextMenuState,
  MenuName,
  QueueSnapshot,
  SettingsState,
} from "../../../../entities/queue/model/types";

export interface DownloaderState {
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
}

const initialState: DownloaderState = {
  urlInput: "",
  destination: DEFAULT_DESTINATION,
  fileName: "",
  settings: DEFAULT_SETTINGS,
  settingsDraft: null,
  snapshot: EMPTY_SNAPSHOT,
  actionError: null,
  previewCommand: "",
  activeMenu: null,
  showLogs: true,
  showProgressDetails: false,
  showAboutDialog: false,
  queuePanelHeight: 230,
  logsPanelHeight: 130,
  draggedItemId: null,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
  },
};

export const downloaderSlice = createSlice({
  name: "downloader",
  initialState,
  reducers: {
    setUrlInput: (state, action: PayloadAction<string>) => {
      state.urlInput = action.payload;
    },
    setDestination: (state, action: PayloadAction<string>) => {
      state.destination = action.payload;
    },
    setFileName: (state, action: PayloadAction<string>) => {
      state.fileName = action.payload;
    },
    setSettings: (state, action: PayloadAction<SettingsState>) => {
      state.settings = action.payload;
    },
    setSettingsDraft: (state, action: PayloadAction<SettingsState | null>) => {
      state.settingsDraft = action.payload;
    },
    patchSettingsDraft: (state, action: PayloadAction<Partial<SettingsState>>) => {
      if (!state.settingsDraft) return;
      state.settingsDraft = { ...state.settingsDraft, ...action.payload };
    },
    setSnapshot: (state, action: PayloadAction<QueueSnapshot>) => {
      state.snapshot = action.payload;
    },
    setActionError: (state, action: PayloadAction<string | null>) => {
      state.actionError = action.payload;
    },
    setPreviewCommand: (state, action: PayloadAction<string>) => {
      state.previewCommand = action.payload;
    },
    setActiveMenu: (state, action: PayloadAction<MenuName | null>) => {
      state.activeMenu = action.payload;
    },
    setShowLogs: (state, action: PayloadAction<boolean>) => {
      state.showLogs = action.payload;
    },
    setShowProgressDetails: (state, action: PayloadAction<boolean>) => {
      state.showProgressDetails = action.payload;
    },
    setShowAboutDialog: (state, action: PayloadAction<boolean>) => {
      state.showAboutDialog = action.payload;
    },
    setQueuePanelHeight: (state, action: PayloadAction<number>) => {
      state.queuePanelHeight = action.payload;
    },
    setLogsPanelHeight: (state, action: PayloadAction<number>) => {
      state.logsPanelHeight = action.payload;
    },
    setDraggedItemId: (state, action: PayloadAction<string | null>) => {
      state.draggedItemId = action.payload;
    },
    setContextMenu: (state, action: PayloadAction<ContextMenuState>) => {
      state.contextMenu = action.payload;
    },
  },
});

export const downloaderActions = downloaderSlice.actions;
