import type { CSSProperties } from "react";
import { AboutDialog } from "../../../widgets/about-dialog/ui/AboutDialog";
import { DownloaderHeader } from "../../../widgets/downloader-header/ui/DownloaderHeader";
import { LogsPanel } from "../../../widgets/logs-panel/ui/LogsPanel";
import { QueueContextMenu } from "../../../widgets/queue-context-menu/ui/QueueContextMenu";
import { QueueSection } from "../../../widgets/queue-section/ui/QueueSection";
import { SettingsDialog } from "../../../widgets/settings-dialog/ui/SettingsDialog";
import {
  applyPreset,
  clampNonNegative,
  formatMb,
  useDownloaderPage,
} from "../model/useDownloaderPage";
import { Button } from "../../../shared/ui/button/Button";
import { FileInput } from "../../../shared/ui/file-input/FileInput";
import { Input } from "../../../shared/ui/input/Input";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./DownloaderPage.module.css";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

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

  const progressStyle = {
    "--progress-fill-width": `${Math.max(0, Math.min(100, progressStats.progressPercent)).toFixed(1)}%`,
  } as CSSProperties;

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

      <section className={cx(styles.panel, styles.addRow)}>
        <Input
          type="text"
          placeholder="Paste direct URL here"
          className={styles.inputUrl}
          value={urlInput}
          onChange={(event) => setUrlInput(event.currentTarget.value)}
        />
        <Button type="button" variant="ghost" onClick={pasteFromClipboard}>
          Paste
        </Button>
        <Button type="button" variant="primary" onClick={addToQueue}>
          Add to queue
        </Button>
      </section>

      <section className={cx(styles.panel, styles.formGrid)}>
        <div className={styles.field}>
          <label>Destination</label>
          <div className={styles.fieldInline}>
            <Input
              type="text"
              value={destination}
              onChange={(event) => setDestination(event.currentTarget.value)}
            />
            <Button type="button" variant="ghost" onClick={browseDestinationFolder}>
              Browse
            </Button>
          </div>
        </div>

        <div className={styles.field}>
          <label>Custom file name (single download only)</label>
          <Input
            type="text"
            placeholder="Optional file name"
            value={fileName}
            onChange={(event) => setFileName(event.currentTarget.value)}
          />
        </div>
      </section>

      <section className={cx(styles.panel, styles.progressCard)}>
        <div className={styles.progressTop}>
          <span className={styles.progressTitle}>Progress</span>
          <Button
            type="button"
            variant="ghost"
            className={styles.compactButton}
            onClick={() => setShowProgressDetails((value) => !value)}
          >
            {showProgressDetails ? "Less" : "More"}
          </Button>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={progressStyle} />
        </div>

        {showProgressDetails ? (
          <div className={styles.progressDetails}>
            <div>Status: {snapshot.isRunning ? "Running" : "Idle"}</div>
            <div>
              Items: queued {progressStats.queued}, downloading {progressStats.downloading},
              completed {progressStats.completed}, failed {progressStats.failed}
            </div>
            <div>Total size: {formatMb(progressStats.totalMb)}</div>
            <div>
              Downloaded: {formatMb(progressStats.downloadedMb)} | Remaining:{" "}
              {formatMb(progressStats.remainingMb)}
            </div>
            <div>
              Speed: {progressStats.active?.speed || "0 MB/s"} | ETA:{" "}
              {progressStats.active?.eta || "--"}
            </div>
          </div>
        ) : null}
      </section>

      <section className={cx(styles.actions, styles.panel)}>
        <Button type="button" variant="primary" onClick={startQueue}>
          {snapshot.isRunning ? "Running..." : "Start"}
        </Button>
        <Button type="button" variant="ghost" onClick={stopQueue}>
          Stop
        </Button>
        <Button type="button" variant="ghost" onClick={previewCurrentCommand}>
          Preview command
        </Button>
        <div className={styles.spacer} />
        <Button type="button" variant="ghost" onClick={clearLogs}>
          Clear log
        </Button>
      </section>

      {previewCommand ? (
        <section className={cx(styles.panel, styles.previewCard)}>
          <div className={styles.sectionHead}>
            <Title as="h2" typography="section">
              Command preview (masked)
            </Title>
          </div>
          <pre className={styles.commandPreview}>{previewCommand}</pre>
        </section>
      ) : null}

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
