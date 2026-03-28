import type { CSSProperties } from "react";
import type { AuthMode, QueuePriority } from "../../../entities/queue/model/types";
import { applyPreset, clampNonNegative, formatMb, useDownloaderPage } from "../model/useDownloaderPage";
import { Button } from "../../../shared/ui/button/Button";
import { Input } from "../../../shared/ui/input/Input";
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
  const queuePanelStyle = {
    "--queue-panel-height": `${queuePanelHeight}px`,
  } as CSSProperties;
  const logsPanelStyle = {
    "--logs-panel-height": `${logsPanelHeight}px`,
  } as CSSProperties;
  const contextMenuStyle = {
    "--context-menu-left": `${contextMenu.x}px`,
    "--context-menu-top": `${contextMenu.y}px`,
  } as CSSProperties;

  return (
    <main className={styles.appShell}>
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,text/plain"
        className={styles.hiddenFileInput}
        onChange={onImportFileChange}
      />

      <header className={cx(styles.topbar, styles.panel)} ref={menuHostRef}>
        <nav className={styles.menuBar}>
          <div className={styles.menuItem}>
            <button type="button" className={styles.menuLink} onClick={() => toggleMenu("file")}>File</button>
            {activeMenu === "file" ? (
              <div className={styles.menuPopup}>
                <button type="button" onClick={importFromTxtFile}>Import .txt</button>
                <button type="button" onClick={() => { void exitApp(); closeMenus(); }}>Exit</button>
              </div>
            ) : null}
          </div>

          <div className={styles.menuItem}>
            <button type="button" className={styles.menuLink} onClick={() => toggleMenu("downloads")}>Downloads</button>
            {activeMenu === "downloads" ? (
              <div className={styles.menuPopup}>
                <button type="button" onClick={() => { void startQueue(); closeMenus(); }}>Start</button>
                <button type="button" onClick={() => { void stopQueue(); closeMenus(); }}>Stop</button>
                <button type="button" onClick={() => { void previewCurrentCommand(); closeMenus(); }}>Preview command</button>
                <button type="button" onClick={() => { void retrySelected(); closeMenus(); }}>Retry selected</button>
                <button type="button" onClick={() => { void retryFailed(); closeMenus(); }}>Retry all failed/canceled</button>
                <button type="button" onClick={() => { void removeSelected(); closeMenus(); }}>Remove selected</button>
                <button type="button" onClick={() => { void removeFailed(); closeMenus(); }}>Remove failed/canceled</button>
                <button type="button" onClick={() => { void clearQueue(); closeMenus(); }}>Clear queue</button>
                <button type="button" onClick={() => { void openSelectedFile(); closeMenus(); }}>Open file</button>
                <button type="button" onClick={() => { void openSelectedFolder(); closeMenus(); }}>Open folder</button>
                <div className={styles.submenuItem}>
                  <button type="button">Priority &gt;</button>
                  <div className={styles.submenuPopup}>
                    <button type="button" onClick={() => { void setSelectedPriority("High"); closeMenus(); }}>High</button>
                    <button type="button" onClick={() => { void setSelectedPriority("Medium"); closeMenus(); }}>Medium</button>
                    <button type="button" onClick={() => { void setSelectedPriority("Low"); closeMenus(); }}>Low</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.menuItem}>
            <button type="button" className={styles.menuLink} onClick={() => toggleMenu("view")}>View</button>
            {activeMenu === "view" ? (
              <div className={styles.menuPopup}>
                <button type="button" onClick={() => { setShowLogs((v) => !v); closeMenus(); }}>
                  {showLogs ? "Hide logs" : "Show logs"}
                </button>
                <button type="button" onClick={() => { void sortQueue("added"); closeMenus(); }}>Sort by date added</button>
                <button type="button" onClick={() => { void sortQueue("extension"); closeMenus(); }}>Sort by extension</button>
                <button type="button" onClick={() => { void sortQueue("priority"); closeMenus(); }}>Sort by priority</button>
              </div>
            ) : null}
          </div>

          <div className={styles.menuItem}>
            <button type="button" className={styles.menuLink} onClick={() => toggleMenu("settings")}>Settings</button>
            {activeMenu === "settings" ? (
              <div className={styles.menuPopup}>
                <button type="button" onClick={openSettingsDialog}>Open settings</button>
                <div className={styles.submenuItem}>
                  <button type="button">Language &gt;</button>
                  <div className={styles.submenuPopup}>
                    <button type="button" onClick={() => { setSettings((prev) => ({ ...prev, language: "en" })); closeMenus(); }}>
                      {settings.language === "en" ? "* " : ""}English
                    </button>
                    <button type="button" onClick={() => { setSettings((prev) => ({ ...prev, language: "ru" })); closeMenus(); }}>
                      {settings.language === "ru" ? "* " : ""}Russian
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.menuItem}>
            <button type="button" className={styles.menuLink} onClick={() => toggleMenu("help")}>Help</button>
            {activeMenu === "help" ? (
              <div className={styles.menuPopup}>
                <button type="button" onClick={() => { setActionError("Check updates: GitHub Releases flow is next step."); closeMenus(); }}>
                  Check Voodoo Loader updates
                </button>
                <button type="button" onClick={() => { setShowAboutDialog(true); closeMenus(); }}>About</button>
              </div>
            ) : null}
          </div>
        </nav>

        <div className={styles.windowTitle}>Voodoo Loader</div>
      </header>

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
          <Button type="button" variant="ghost" className={styles.compactButton} onClick={() => setShowProgressDetails((v) => !v)}>
            {showProgressDetails ? "Less" : "More"}
          </Button>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={progressStyle} />
        </div>

        {showProgressDetails ? (
          <div className={styles.progressDetails}>
            <div>Status: {snapshot.isRunning ? "Running" : "Idle"}</div>
            <div>Items: queued {progressStats.queued}, downloading {progressStats.downloading}, completed {progressStats.completed}, failed {progressStats.failed}</div>
            <div>Total size: {formatMb(progressStats.totalMb)}</div>
            <div>Downloaded: {formatMb(progressStats.downloadedMb)} | Remaining: {formatMb(progressStats.remainingMb)}</div>
            <div>Speed: {progressStats.active?.speed || "0 MB/s"} | ETA: {progressStats.active?.eta || "--"}</div>
          </div>
        ) : null}
      </section>

      <section className={cx(styles.actions, styles.panel)}>
        <Button type="button" variant="primary" onClick={startQueue}>{snapshot.isRunning ? "Running..." : "Start"}</Button>
        <Button type="button" variant="ghost" onClick={stopQueue}>Stop</Button>
        <Button type="button" variant="ghost" onClick={previewCurrentCommand}>Preview command</Button>
        <div className={styles.spacer} />
        <Button type="button" variant="ghost" onClick={clearLogs}>Clear log</Button>
      </section>

      {previewCommand ? (
        <section className={cx(styles.panel, styles.previewCard)}>
          <div className={styles.sectionHead}><h2>Command preview (masked)</h2></div>
          <pre className={styles.commandPreview}>{previewCommand}</pre>
        </section>
      ) : null}

      <section className={cx(styles.panel, styles.queueCard)} onContextMenu={onQueueContextMenu}>
        <div className={styles.sectionHead}>
          <h2>Download queue</h2>
          <div className={styles.queueMeta}>{snapshot.items.length} items</div>
        </div>

        <div className={styles.queueToolbar}>
          <label className={styles.selectAll}>
            <input type="checkbox" checked={snapshot.items.length > 0 && selectedCount === snapshot.items.length} onChange={(event) => void setAllSelected(event.currentTarget.checked)} />
            Select all
          </label>
          <span>{selectedCount} selected</span>
        </div>

        <div className={cx(styles.tableWrap, styles.resizable)} ref={queuePanelRef} style={queuePanelStyle} onMouseUp={updatePanelHeights}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Select</th><th>File</th><th>Status</th><th>Progress</th><th>Speed</th><th>ETA</th><th>Total size</th><th>Priority</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.length === 0 ? (
                <tr><td colSpan={9} className={styles.emptyRow}>Queue is empty. Add a link to start.</td></tr>
              ) : (
                snapshot.items.map((item) => (
                  <tr
                    key={item.id}
                    className={styles.draggableRow}
                    draggable
                    onContextMenu={(event) => { void onRowContextMenu(event, item.id); }}
                    onDragStart={(event) => {
                      setDraggedItemId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragged = event.dataTransfer.getData("text/plain") || draggedItemId;
                      if (dragged) void reorderItemsByDrag(dragged, item.id);
                      setDraggedItemId(null);
                    }}
                    onDragEnd={() => setDraggedItemId(null)}
                  >
                    <td><input type="checkbox" checked={item.selected} onChange={(event) => void setItemSelected(item.id, event.currentTarget.checked)} /></td>
                    <td className={styles.fileCol}><div>{item.fileName}</div><small>{item.url}</small></td>
                    <td><span className={styles.status} data-status={item.status.toLowerCase()}>{item.status}</span></td>
                    <td>{item.progress.toFixed(0)}%</td>
                    <td>{item.speed}</td>
                    <td>{item.eta}</td>
                    <td>{item.totalSize}</td>
                    <td>
                      <select className={cx(styles.controlInput, styles.controlSelect, styles.compactSelect)} value={item.priority} onChange={(event) => void setItemPriority(item.id, event.currentTarget.value as QueuePriority)}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </td>
                    <td className={styles.rowActions}>
                      {item.status.toLowerCase() === "failed" || item.status.toLowerCase() === "canceled" ? (
                        <Button type="button" variant="mini" onClick={() => void retryItem(item.id)}>Retry</Button>
                      ) : null}
                      <Button type="button" variant="mini" onClick={() => void removeItem(item.id)}>Remove</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showLogs ? (
        <section className={cx(styles.panel, styles.logsCard)}>
          <div className={styles.sectionHead}><h2>Logs</h2></div>
          <div className={cx(styles.logsBox, styles.resizable)} ref={logsPanelRef} style={logsPanelStyle} onMouseUp={updatePanelHeights}>
            {actionError ? <div className={styles.logError}>[ERROR] {actionError}</div> : null}
            {snapshot.logs.length === 0 ? (
              <div>[INFO] No logs yet.</div>
            ) : (
              snapshot.logs.map((log) => (<div key={`${log.timestamp}-${log.message}`}>[{log.level}] {log.message}</div>))
            )}
          </div>
        </section>
      ) : null}

      {contextMenu.visible ? (
        <div className={styles.contextMenu} style={contextMenuStyle}>
          <button type="button" onClick={() => { void retrySelected(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Retry selected</button>
          <button type="button" onClick={() => { void retryFailed(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Retry all failed/canceled</button>
          <button type="button" onClick={() => { void removeSelected(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Remove selected</button>
          <button type="button" onClick={() => { void removeFailed(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Remove failed/canceled</button>
          <button type="button" onClick={() => { void clearQueue(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Clear queue</button>
          <button type="button" onClick={() => { void openSelectedFile(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Open file</button>
          <button type="button" onClick={() => { void openSelectedFolder(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Open folder</button>
          <div className={styles.submenuItem}>
            <button type="button">Priority &gt;</button>
            <div className={styles.submenuPopup}>
              <button type="button" onClick={() => { void setSelectedPriority("High"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>High</button>
              <button type="button" onClick={() => { void setSelectedPriority("Medium"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Medium</button>
              <button type="button" onClick={() => { void setSelectedPriority("Low"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Low</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogSettings ? (
        <div className={styles.modalBackdrop} onClick={closeSettingsDialog}>
          <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>Settings</h2>
              <button type="button" className={styles.modalClose} onClick={closeSettingsDialog}>x</button>
            </div>

            <div className={styles.modalBody}>
              <fieldset className={styles.settingsGroup}>
                <legend>Speed presets / aria2</legend>
                <div className={cx(styles.field, styles.fieldTwoCol)}>
                  <div>
                    <label>Preset</label>
                    <select className={cx(styles.controlInput, styles.controlSelect)} value={dialogSettings.speedPreset} onChange={(event) => updateDraft(applyPreset(dialogSettings, event.currentTarget.value))}>
                      <option>Safe</option><option>Balanced</option><option>Fast</option><option>Aggressive</option><option>Very large files</option><option>Manual</option>
                    </select>
                  </div>
                  <div>
                    <label>Connections (-x)</label>
                    <input type="number" min={1} className={styles.controlInput} value={dialogSettings.connections} onChange={(event) => updateDraft({ connections: clampNonNegative(Number(event.currentTarget.value), 16) })} />
                  </div>
                </div>

                <div className={cx(styles.field, styles.fieldTwoCol)}>
                  <div>
                    <label>Splits (-s)</label>
                    <input type="number" min={1} className={styles.controlInput} value={dialogSettings.splits} onChange={(event) => updateDraft({ splits: clampNonNegative(Number(event.currentTarget.value), 16) })} />
                  </div>
                  <div>
                    <label>Chunk size (-k)</label>
                    <input type="text" className={styles.controlInput} value={dialogSettings.chunkSize} onChange={(event) => updateDraft({ chunkSize: event.currentTarget.value })} />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.toggleRow}>
                    <input type="checkbox" checked={dialogSettings.continueDownload} onChange={(event) => updateDraft({ continueDownload: event.currentTarget.checked })} />
                    Enable continue/resume (-c)
                  </label>
                  <small className={styles.fieldNote}>If enabled, aria2 continues partial downloads instead of restarting from zero when possible.</small>
                </div>

                <div className={styles.field}>
                  <label>User-Agent</label>
                  <input type="text" className={styles.controlInput} value={dialogSettings.userAgent} onChange={(event) => updateDraft({ userAgent: event.currentTarget.value })} />
                </div>
              </fieldset>

              <fieldset className={styles.settingsGroup}>
                <legend>Queue</legend>
                <div className={styles.field}>
                  <label>Max simultaneous downloads (0 = unlimited)</label>
                  <input type="number" min={0} className={styles.controlInput} value={dialogSettings.maxSimultaneousDownloads} onChange={(event) => updateDraft({ maxSimultaneousDownloads: clampNonNegative(Number(event.currentTarget.value), 0) })} />
                </div>
              </fieldset>

              <fieldset className={styles.settingsGroup}>
                <legend>aria2 provisioning</legend>
                <div className={styles.field}>
                  <label className={styles.toggleRow}>
                    <input type="checkbox" checked={dialogSettings.autoProvisionAria2} onChange={(event) => updateDraft({ autoProvisionAria2: event.currentTarget.checked })} />
                    Auto-download aria2 if missing
                  </label>
                </div>
                <div className={styles.field}>
                  <label>Custom aria2 path</label>
                  <div className={styles.fieldInline}>
                    <input type="text" className={styles.controlInput} placeholder="Optional custom path to aria2c.exe" value={dialogSettings.customAria2Path} onChange={(event) => updateDraft({ customAria2Path: event.currentTarget.value })} />
                    <Button type="button" variant="ghost" onClick={browseCustomAria2Path}>Browse</Button>
                  </div>
                </div>
              </fieldset>

              <fieldset className={styles.settingsGroup}>
                <legend>Authentication</legend>
                <div className={styles.field}>
                  <label>Auth mode</label>
                  <select className={cx(styles.controlInput, styles.controlSelect)} value={dialogSettings.authMode} onChange={(event) => updateDraft({ authMode: event.currentTarget.value as AuthMode })}>
                    <option value="none">No auth</option><option value="token">Token + headers</option><option value="basic">Login/password</option>
                  </select>
                </div>

                {dialogSettings.authMode === "token" ? (
                  <div className={styles.field}>
                    <label>Token</label>
                    <input type="password" className={styles.controlInput} value={dialogSettings.token} onChange={(event) => updateDraft({ token: event.currentTarget.value })} />
                  </div>
                ) : null}

                {dialogSettings.authMode === "basic" ? (
                  <div className={cx(styles.field, styles.fieldTwoCol)}>
                    <div>
                      <label>Username</label>
                      <input type="text" className={styles.controlInput} value={dialogSettings.username} onChange={(event) => updateDraft({ username: event.currentTarget.value })} />
                    </div>
                    <div>
                      <label>Password</label>
                      <input type="password" className={styles.controlInput} value={dialogSettings.password} onChange={(event) => updateDraft({ password: event.currentTarget.value })} />
                    </div>
                  </div>
                ) : null}

                <div className={styles.field}>
                  <label>Headers</label>
                  <textarea className={cx(styles.controlInput, styles.controlTextarea)} value={dialogSettings.extraHeaders} onChange={(event) => updateDraft({ extraHeaders: event.currentTarget.value })} />
                </div>

                <div className={styles.field}>
                  <label>Max connections per server (0 = unlimited)</label>
                  <input type="number" min={0} className={styles.controlInput} value={dialogSettings.maxConnectionsPerServer} onChange={(event) => updateDraft({ maxConnectionsPerServer: clampNonNegative(Number(event.currentTarget.value), 0) })} />
                </div>
              </fieldset>
            </div>

            <div className={styles.modalActions}>
              <Button type="button" variant="primary" onClick={applySettingsDialog}>OK</Button>
              <Button type="button" variant="ghost" onClick={closeSettingsDialog}>Cancel</Button>
            </div>
          </section>
        </div>
      ) : null}

      {showAboutDialog ? (
        <div className={styles.modalBackdrop} onClick={() => setShowAboutDialog(false)}>
          <section className={styles.aboutModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.aboutHead}>
              <h3>About Voodoo Loader</h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowAboutDialog(false)}>x</button>
            </div>
            <div className={styles.aboutBody}>
              <div className={styles.aboutIcon}>i</div>
              <div>
                <div>Voodoo Loader</div>
                <div>Version: 0.2.0-alpha</div>
                <div className={styles.aboutSub}>Universal downloader powered by aria2.</div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button type="button" variant="primary" onClick={() => setShowAboutDialog(false)}>OK</Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
