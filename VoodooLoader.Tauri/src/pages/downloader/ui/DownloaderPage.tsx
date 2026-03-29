import { AboutDialog } from "../../../widgets/about-dialog/ui/AboutDialog";
import { AddToQueueSection } from "../../../widgets/add-to-queue/ui/AddToQueueSection";
import { CommandPreviewSection } from "../../../widgets/command-preview/ui/CommandPreviewSection";
import { DownloaderHeader } from "../../../widgets/downloader-header/ui/DownloaderHeader";
import { DestinationSection } from "../../../widgets/destination-section/ui/DestinationSection";
import { LogsPanel } from "../../../widgets/logs-panel/ui/LogsPanel";
import { ProgressSection } from "../../../widgets/progress-section/ui/ProgressSection";
import { QueueActionsSection } from "../../../widgets/queue-actions/ui/QueueActionsSection";
import { QueueContextMenu } from "../../../widgets/queue-context-menu/ui/QueueContextMenu";
import { QueueSection } from "../../../widgets/queue-section/ui/QueueSection";
import { SettingsDialog } from "../../../widgets/settings-dialog/ui/SettingsDialog";
import { applyPreset, clampNonNegative, useDownloaderPage } from "../model/useDownloaderPage";
import { FileInput } from "../../../shared/ui/file-input/FileInput";
import styles from "./DownloaderPage.module.css";

export function DownloaderPage() {
  const page = useDownloaderPage();
  const {
    urlInput,
    destination,
    fileName,
    settings,
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
    dialogSettings,
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
  } = page;

  return (
    <main className={styles.appShell}>
      <FileInput
        ref={importInputRef}
        accept=".txt,text/plain"
        className={styles.hiddenFileInput}
        onChange={(event) => {
          void onImportFileChange(event);
        }}
      />

      <div ref={menuHostRef}>
        <DownloaderHeader
          activeMenu={activeMenu}
          settings={settings}
          onToggleMenu={toggleMenu}
          onCloseMenus={closeMenus}
          onImportFromTxtFile={importFromTxtFile}
          onExit={exitApp}
          onStartQueue={startQueue}
          onStopQueue={stopQueue}
          onPreviewCurrentCommand={previewCurrentCommand}
          onRetrySelected={retrySelected}
          onRetryFailed={retryFailed}
          onRemoveSelected={removeSelected}
          onRemoveFailed={removeFailed}
          onClearQueue={clearQueue}
          onOpenSelectedFile={openSelectedFile}
          onOpenSelectedFolder={openSelectedFolder}
          onSetSelectedPriority={setSelectedPriority}
          onToggleShowLogs={() => {
            setShowLogs((value) => !value);
            closeMenus();
          }}
          showLogs={showLogs}
          onSortQueue={sortQueue}
          onOpenSettingsDialog={openSettingsDialog}
          onSetLanguage={(language) => {
            setSettings((prev) => ({ ...prev, language }));
            closeMenus();
          }}
          onOpenAboutDialog={() => {
            setShowAboutDialog(true);
            closeMenus();
          }}
          onCheckUpdates={() => {
            setActionError("Check updates: GitHub Releases flow is next step.");
            closeMenus();
          }}
        />
      </div>

      <AddToQueueSection
        urlInput={urlInput}
        onUrlInputChange={setUrlInput}
        onPasteFromClipboard={pasteFromClipboard}
        onAddToQueue={addToQueue}
      />

      <DestinationSection
        destination={destination}
        fileName={fileName}
        onDestinationChange={setDestination}
        onFileNameChange={setFileName}
        onBrowseDestinationFolder={browseDestinationFolder}
      />

      <ProgressSection
        snapshot={snapshot}
        progressStats={progressStats}
        showProgressDetails={showProgressDetails}
        onToggleDetails={() => setShowProgressDetails((value) => !value)}
      />

      <QueueActionsSection
        snapshot={snapshot}
        onStartQueue={startQueue}
        onPauseQueue={pauseQueue}
        onStopQueue={stopQueue}
        onPreviewCurrentCommand={previewCurrentCommand}
        onClearLogs={clearLogs}
      />

      <CommandPreviewSection previewCommand={previewCommand} />

      <QueueSection
        snapshot={snapshot}
        selectedCount={selectedCount}
        draggedItemId={draggedItemId}
        queuePanelHeight={queuePanelHeight}
        queuePanelRef={queuePanelRef}
        onUpdatePanelHeights={updatePanelHeights}
        onSetDraggedItemId={setDraggedItemId}
        onReorderItemsByDrag={reorderItemsByDrag}
        onSetAllSelected={setAllSelected}
        onSetItemSelected={setItemSelected}
        onSetItemPriority={setItemPriority}
        onRetryItem={retryItem}
        onRemoveItem={removeItem}
        onQueueContextMenu={onQueueContextMenu}
        onRowContextMenu={onRowContextMenu}
      />

      <LogsPanel
        visible={showLogs}
        logs={snapshot.logs}
        actionError={actionError}
        logsPanelHeight={logsPanelHeight}
        logsPanelRef={logsPanelRef}
        onUpdatePanelHeights={updatePanelHeights}
      />

      <QueueContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        onRetrySelected={retrySelected}
        onRetryFailed={retryFailed}
        onRemoveSelected={removeSelected}
        onRemoveFailed={removeFailed}
        onClearQueue={clearQueue}
        onOpenSelectedFile={openSelectedFile}
        onOpenSelectedFolder={openSelectedFolder}
        onSetSelectedPriority={setSelectedPriority}
      />

      <SettingsDialog
        dialogSettings={dialogSettings}
        onClose={closeSettingsDialog}
        onApply={applySettingsDialog}
        onUpdateDraft={updateDraft}
        onBrowseCustomAria2Path={browseCustomAria2Path}
        onApplyPreset={applyPreset}
        onClampNonNegative={clampNonNegative}
      />

      <AboutDialog visible={showAboutDialog} onClose={() => setShowAboutDialog(false)} />
    </main>
  );
}
