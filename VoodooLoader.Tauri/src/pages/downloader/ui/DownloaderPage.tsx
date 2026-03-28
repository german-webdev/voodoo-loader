import "../../../app/styles/app.css";
import type { AuthMode, QueuePriority } from "../../../entities/queue/model/types";
import { applyPreset, clampNonNegative, formatMb, useDownloaderPage } from "../model/useDownloaderPage";
import { Button } from "../../../shared/ui/button/Button";
import { Input } from "../../../shared/ui/input/Input";

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
  return (
    <main className="app-shell">
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden-file-input"
        onChange={onImportFileChange}
      />

      <header className="topbar panel" ref={menuHostRef}>
        <nav className="menu-bar">
          <div className="menu-item">
            <button type="button" className="menu-link" onClick={() => toggleMenu("file")}>File</button>
            {activeMenu === "file" ? (
              <div className="menu-popup">
                <button type="button" onClick={importFromTxtFile}>Import .txt</button>
                <button type="button" onClick={() => { void exitApp(); closeMenus(); }}>Exit</button>
              </div>
            ) : null}
          </div>

          <div className="menu-item">
            <button type="button" className="menu-link" onClick={() => toggleMenu("downloads")}>Downloads</button>
            {activeMenu === "downloads" ? (
              <div className="menu-popup">
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
                <div className="submenu-item">
                  <button type="button">Priority &gt;</button>
                  <div className="submenu-popup">
                    <button type="button" onClick={() => { void setSelectedPriority("High"); closeMenus(); }}>High</button>
                    <button type="button" onClick={() => { void setSelectedPriority("Medium"); closeMenus(); }}>Medium</button>
                    <button type="button" onClick={() => { void setSelectedPriority("Low"); closeMenus(); }}>Low</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="menu-item">
            <button type="button" className="menu-link" onClick={() => toggleMenu("view")}>View</button>
            {activeMenu === "view" ? (
              <div className="menu-popup">
                <button type="button" onClick={() => { setShowLogs((v) => !v); closeMenus(); }}>
                  {showLogs ? "? Show logs" : "Show logs"}
                </button>
                <button type="button" onClick={() => { void sortQueue("added"); closeMenus(); }}>Sort by date added</button>
                <button type="button" onClick={() => { void sortQueue("extension"); closeMenus(); }}>Sort by extension</button>
                <button type="button" onClick={() => { void sortQueue("priority"); closeMenus(); }}>Sort by priority</button>
              </div>
            ) : null}
          </div>

          <div className="menu-item">
            <button type="button" className="menu-link" onClick={() => toggleMenu("settings")}>Settings</button>
            {activeMenu === "settings" ? (
              <div className="menu-popup">
                <button type="button" onClick={openSettingsDialog}>Open settings</button>
                <div className="submenu-item">
                  <button type="button">Language &gt;</button>
                  <div className="submenu-popup">
                    <button type="button" onClick={() => { setSettings((prev) => ({ ...prev, language: "en" })); closeMenus(); }}>
                      {settings.language === "en" ? "* " : ""}English
                    </button>
                    <button type="button" onClick={() => { setSettings((prev) => ({ ...prev, language: "ru" })); closeMenus(); }}>
                      {settings.language === "ru" ? "* " : ""}Русский
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="menu-item">
            <button type="button" className="menu-link" onClick={() => toggleMenu("help")}>Help</button>
            {activeMenu === "help" ? (
              <div className="menu-popup">
                <button type="button" onClick={() => { setActionError("Check updates: GitHub Releases flow is next step."); closeMenus(); }}>
                  Check Voodoo Loader updates
                </button>
                <button type="button" onClick={() => { setShowAboutDialog(true); closeMenus(); }}>About</button>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="window-title">Voodoo Loader</div>
      </header>

      <section className="panel add-row">
        <Input
          type="text"
          placeholder="Paste direct URL here"
          className="input-url"
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

      <section className="panel form-grid">
        <div className="field">
          <label>Destination</label>
          <div className="field-inline">
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

        <div className="field">
          <label>Custom file name (single download only)</label>
          <Input
            type="text"
            placeholder="Optional file name"
            value={fileName}
            onChange={(event) => setFileName(event.currentTarget.value)}
          />
        </div>
      </section>

      <section className="panel progress-card">
        <div className="progress-top">
          <span className="progress-title">Progress</span>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => setShowProgressDetails((v) => !v)}>
            {showProgressDetails ? "Less" : "More"}
          </button>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progressStats.progressPercent)).toFixed(1)}%` }} />
        </div>

        {showProgressDetails ? (
          <div className="progress-details">
            <div>Status: {snapshot.isRunning ? "Running" : "Idle"}</div>
            <div>Items: queued {progressStats.queued}, downloading {progressStats.downloading}, completed {progressStats.completed}, failed {progressStats.failed}</div>
            <div>Total size: {formatMb(progressStats.totalMb)}</div>
            <div>Downloaded: {formatMb(progressStats.downloadedMb)} | Remaining: {formatMb(progressStats.remainingMb)}</div>
            <div>Speed: {progressStats.active?.speed || "0 MB/s"} | ETA: {progressStats.active?.eta || "--"}</div>
          </div>
        ) : null}
      </section>

      <section className="actions panel">
        <button type="button" className="btn btn-primary" onClick={startQueue}>{snapshot.isRunning ? "Running..." : "Start"}</button>
        <button type="button" className="btn btn-ghost" onClick={stopQueue}>Stop</button>
        <button type="button" className="btn btn-ghost" onClick={previewCurrentCommand}>Preview command</button>
        <div className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={clearLogs}>Clear log</button>
      </section>

      {previewCommand ? (
        <section className="panel preview-card">
          <div className="section-head"><h2>Command preview (masked)</h2></div>
          <pre className="command-preview">{previewCommand}</pre>
        </section>
      ) : null}

      <section className="panel queue-card" onContextMenu={onQueueContextMenu}>
        <div className="section-head">
          <h2>Download queue</h2>
          <div className="queue-meta">{snapshot.items.length} items</div>
        </div>

        <div className="queue-toolbar">
          <label className="select-all">
            <input type="checkbox" checked={snapshot.items.length > 0 && selectedCount === snapshot.items.length} onChange={(event) => void setAllSelected(event.currentTarget.checked)} />
            Select all
          </label>
          <span>{selectedCount} selected</span>
        </div>

        <div className="table-wrap resizable" ref={queuePanelRef} style={{ height: `${queuePanelHeight}px` }} onMouseUp={updatePanelHeights}>
          <table>
            <thead>
              <tr>
                <th>Select</th><th>File</th><th>Status</th><th>Progress</th><th>Speed</th><th>ETA</th><th>Total size</th><th>Priority</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">Queue is empty. Add a link to start.</td></tr>
              ) : (
                snapshot.items.map((item) => (
                  <tr
                    key={item.id}
                    className="draggable-row"
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
                    <td className="file-col"><div>{item.fileName}</div><small>{item.url}</small></td>
                    <td><span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span></td>
                    <td>{item.progress.toFixed(0)}%</td>
                    <td>{item.speed}</td>
                    <td>{item.eta}</td>
                    <td>{item.totalSize}</td>
                    <td>
                      <select className="input select compact-select" value={item.priority} onChange={(event) => void setItemPriority(item.id, event.currentTarget.value as QueuePriority)}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </td>
                    <td className="row-actions">
                      {item.status.toLowerCase() === "failed" || item.status.toLowerCase() === "canceled" ? (
                        <button type="button" className="btn btn-mini" onClick={() => void retryItem(item.id)}>Retry</button>
                      ) : null}
                      <button type="button" className="btn btn-mini" onClick={() => void removeItem(item.id)}>Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showLogs ? (
        <section className="panel logs-card">
          <div className="section-head"><h2>Logs</h2></div>
          <div className="logs-placeholder resizable" ref={logsPanelRef} style={{ height: `${logsPanelHeight}px` }} onMouseUp={updatePanelHeights}>
            {actionError ? <div className="log-error">[ERROR] {actionError}</div> : null}
            {snapshot.logs.length === 0 ? (
              <div>[INFO] No logs yet.</div>
            ) : (
              snapshot.logs.map((log) => (<div key={`${log.timestamp}-${log.message}`}>[{log.level}] {log.message}</div>))
            )}
          </div>
        </section>
      ) : null}

      {contextMenu.visible ? (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button type="button" onClick={() => { void retrySelected(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Retry selected</button>
          <button type="button" onClick={() => { void retryFailed(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Retry all failed/canceled</button>
          <button type="button" onClick={() => { void removeSelected(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Remove selected</button>
          <button type="button" onClick={() => { void removeFailed(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Remove failed/canceled</button>
          <button type="button" onClick={() => { void clearQueue(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Clear queue</button>
          <button type="button" onClick={() => { void openSelectedFile(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Open file</button>
          <button type="button" onClick={() => { void openSelectedFolder(); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Open folder</button>
          <div className="submenu-item">
            <button type="button">Priority &gt;</button>
            <div className="submenu-popup">
              <button type="button" onClick={() => { void setSelectedPriority("High"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>High</button>
              <button type="button" onClick={() => { void setSelectedPriority("Medium"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Medium</button>
              <button type="button" onClick={() => { void setSelectedPriority("Low"); setContextMenu({ visible: false, x: 0, y: 0 }); }}>Low</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogSettings ? (
        <div className="modal-backdrop" onClick={closeSettingsDialog}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Settings</h2>
              <button type="button" className="modal-close" onClick={closeSettingsDialog}>x</button>
            </div>

            <div className="modal-body">
              <fieldset className="settings-group">
                <legend>Speed presets / aria2</legend>
                <div className="field field-2col">
                  <div>
                    <label>Preset</label>
                    <select className="input select" value={dialogSettings.speedPreset} onChange={(event) => updateDraft(applyPreset(dialogSettings, event.currentTarget.value))}>
                      <option>Safe</option><option>Balanced</option><option>Fast</option><option>Aggressive</option><option>Very large files</option><option>Manual</option>
                    </select>
                  </div>
                  <div>
                    <label>Connections (-x)</label>
                    <input type="number" min={1} className="input" value={dialogSettings.connections} onChange={(event) => updateDraft({ connections: clampNonNegative(Number(event.currentTarget.value), 16) })} />
                  </div>
                </div>

                <div className="field field-2col">
                  <div>
                    <label>Splits (-s)</label>
                    <input type="number" min={1} className="input" value={dialogSettings.splits} onChange={(event) => updateDraft({ splits: clampNonNegative(Number(event.currentTarget.value), 16) })} />
                  </div>
                  <div>
                    <label>Chunk size (-k)</label>
                    <input type="text" className="input" value={dialogSettings.chunkSize} onChange={(event) => updateDraft({ chunkSize: event.currentTarget.value })} />
                  </div>
                </div>

                <div className="field">
                  <label className="toggle-row">
                    <input type="checkbox" checked={dialogSettings.continueDownload} onChange={(event) => updateDraft({ continueDownload: event.currentTarget.checked })} />
                    Enable continue/resume (-c)
                  </label>
                  <small className="field-note">If enabled, aria2 continues partial downloads instead of restarting from zero when possible.</small>
                </div>

                <div className="field">
                  <label>User-Agent</label>
                  <input type="text" className="input" value={dialogSettings.userAgent} onChange={(event) => updateDraft({ userAgent: event.currentTarget.value })} />
                </div>
              </fieldset>

              <fieldset className="settings-group">
                <legend>Queue</legend>
                <div className="field">
                  <label>Max simultaneous downloads (0 = unlimited)</label>
                  <input type="number" min={0} className="input" value={dialogSettings.maxSimultaneousDownloads} onChange={(event) => updateDraft({ maxSimultaneousDownloads: clampNonNegative(Number(event.currentTarget.value), 0) })} />
                </div>
              </fieldset>

              <fieldset className="settings-group">
                <legend>aria2 provisioning</legend>
                <div className="field">
                  <label className="toggle-row">
                    <input type="checkbox" checked={dialogSettings.autoProvisionAria2} onChange={(event) => updateDraft({ autoProvisionAria2: event.currentTarget.checked })} />
                    Auto-download aria2 if missing
                  </label>
                </div>
                <div className="field">
                  <label>Custom aria2 path</label>
                  <div className="field-inline">
                    <input type="text" className="input" placeholder="Optional custom path to aria2c.exe" value={dialogSettings.customAria2Path} onChange={(event) => updateDraft({ customAria2Path: event.currentTarget.value })} />
                    <button type="button" className="btn btn-ghost" onClick={browseCustomAria2Path}>Browse</button>
                  </div>
                </div>
              </fieldset>

              <fieldset className="settings-group">
                <legend>Authentication</legend>
                <div className="field">
                  <label>Auth mode</label>
                  <select className="input select" value={dialogSettings.authMode} onChange={(event) => updateDraft({ authMode: event.currentTarget.value as AuthMode })}>
                    <option value="none">No auth</option><option value="token">Token + headers</option><option value="basic">Login/password</option>
                  </select>
                </div>

                {dialogSettings.authMode === "token" ? (
                  <div className="field">
                    <label>Token</label>
                    <input type="password" className="input" value={dialogSettings.token} onChange={(event) => updateDraft({ token: event.currentTarget.value })} />
                  </div>
                ) : null}

                {dialogSettings.authMode === "basic" ? (
                  <div className="field field-2col">
                    <div>
                      <label>Username</label>
                      <input type="text" className="input" value={dialogSettings.username} onChange={(event) => updateDraft({ username: event.currentTarget.value })} />
                    </div>
                    <div>
                      <label>Password</label>
                      <input type="password" className="input" value={dialogSettings.password} onChange={(event) => updateDraft({ password: event.currentTarget.value })} />
                    </div>
                  </div>
                ) : null}

                <div className="field">
                  <label>Headers</label>
                  <textarea className="input textarea" value={dialogSettings.extraHeaders} onChange={(event) => updateDraft({ extraHeaders: event.currentTarget.value })} />
                </div>

                <div className="field">
                  <label>Max connections per server (0 = unlimited)</label>
                  <input type="number" min={0} className="input" value={dialogSettings.maxConnectionsPerServer} onChange={(event) => updateDraft({ maxConnectionsPerServer: clampNonNegative(Number(event.currentTarget.value), 0) })} />
                </div>
              </fieldset>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={applySettingsDialog}>OK</button>
              <button type="button" className="btn btn-ghost" onClick={closeSettingsDialog}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}

      {showAboutDialog ? (
        <div className="modal-backdrop" onClick={() => setShowAboutDialog(false)}>
          <section className="about-modal" onClick={(event) => event.stopPropagation()}>
            <div className="about-head">
              <h3>About Voodoo Loader</h3>
              <button type="button" className="modal-close" onClick={() => setShowAboutDialog(false)}>x</button>
            </div>
            <div className="about-body">
              <div className="about-icon">i</div>
              <div>
                <div>Voodoo Loader</div>
                <div>Version: 0.2.0-alpha</div>
                <div className="about-sub">Universal downloader powered by aria2.</div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowAboutDialog(false)}>OK</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}


