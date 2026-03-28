import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";

type QueueStatus = "Queued" | "Downloading" | "Completed" | "Failed" | string;
type AuthMode = "none" | "token" | "basic";

type QueueItem = {
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
};

type LogEntry = {
  level: string;
  message: string;
  timestamp: string;
};

type QueueSnapshot = {
  isRunning: boolean;
  items: QueueItem[];
  logs: LogEntry[];
};

type PreviewCommandInput = {
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
};

const EMPTY_SNAPSHOT: QueueSnapshot = {
  isRunning: false,
  items: [],
  logs: [],
};

function App() {
  const [urlInput, setUrlInput] = useState("");
  const [destination, setDestination] = useState("C:\\Downloads\\VoodooLoader");
  const [fileName, setFileName] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [speedPreset, setSpeedPreset] = useState("Balanced");
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [extraHeaders, setExtraHeaders] = useState("");
  const [continueDownload, setContinueDownload] = useState(true);
  const [maxConnections, setMaxConnections] = useState(8);
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY_SNAPSHOT);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewCommand, setPreviewCommand] = useState("");

  useEffect(() => {
    let isMounted = true;
    let unlisten: UnlistenFn | null = null;

    async function bootstrap() {
      try {
        const initial = await invoke<QueueSnapshot>("queue_snapshot");
        if (isMounted) {
          setSnapshot(initial);
        }
      } catch (error) {
        if (isMounted) {
          setActionError(`Backend unavailable: ${String(error)}`);
        }
      }

      try {
        unlisten = await listen<QueueSnapshot>("queue://snapshot", (event) => {
          if (isMounted) {
            setSnapshot(event.payload);
          }
        });
      } catch (error) {
        if (isMounted) {
          setActionError(`Event bridge unavailable: ${String(error)}`);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (snapshot.items.length === 0) {
      return 0;
    }
    const total = snapshot.items.reduce((acc, item) => acc + item.progress, 0);
    return Math.max(0, Math.min(100, total / snapshot.items.length));
  }, [snapshot.items]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(String(error));
    }
  }

  async function addToQueue() {
    if (!urlInput.trim()) {
      setActionError("URL is required.");
      return;
    }

    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("add_queue_item", {
        url: urlInput,
        destination,
        fileName: fileName.trim() || null,
      });
      setSnapshot(next);
      setUrlInput("");
      setFileName("");
    });
  }

  async function importFromText() {
    if (!importText.trim()) {
      setActionError("Import text is empty.");
      return;
    }

    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("add_queue_items_from_text", {
        text: importText,
        destination,
      });
      setSnapshot(next);
      setImportText("");
      setShowImport(false);
    });
  }

  async function startQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("start_queue");
      setSnapshot(next);
    });
  }

  async function stopQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("stop_queue");
      setSnapshot(next);
    });
  }

  async function clearLogs() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("clear_logs");
      setSnapshot(next);
    });
  }

  async function clearQueue() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("clear_queue");
      setSnapshot(next);
    });
  }

  async function removeItem(id: string) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("remove_queue_item", { id });
      setSnapshot(next);
    });
  }

  async function retryItem(id: string) {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("retry_queue_item", { id });
      setSnapshot(next);
    });
  }

  async function retryFailed() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("retry_failed_items");
      setSnapshot(next);
    });
  }

  async function removeFailed() {
    await runAction(async () => {
      const next = await invoke<QueueSnapshot>("remove_failed_items");
      setSnapshot(next);
    });
  }

  async function previewCurrentCommand() {
    const effectiveUrl = urlInput.trim() || snapshot.items[0]?.url || "";
    if (!effectiveUrl) {
      setActionError("URL is required for preview.");
      return;
    }

    await runAction(async () => {
      const input: PreviewCommandInput = {
        url: effectiveUrl,
        destination,
        fileName: fileName.trim() || null,
        authMode,
        token: token.trim() || null,
        username: username.trim() || null,
        password: password.trim() || null,
        extraHeaders: extraHeaders.trim() || null,
        continueDownload,
        maxConnections,
      };

      const cmd = await invoke<string>("build_preview_command", { input });
      setPreviewCommand(cmd);
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar panel">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-title">Voodoo Loader</span>
          <span className="brand-badge">Tauri v2</span>
        </div>
        <nav className="menu">
          <button type="button" className="menu-link">File</button>
          <button type="button" className="menu-link">Downloads</button>
          <button type="button" className="menu-link">View</button>
          <button type="button" className="menu-link">Settings</button>
          <button type="button" className="menu-link">Help</button>
        </nav>
      </header>

      <section className="panel add-row">
        <input
          type="text"
          placeholder="Paste direct URL here"
          className="input input-url"
          value={urlInput}
          onChange={(event) => setUrlInput(event.currentTarget.value)}
        />
        <button type="button" className="btn btn-ghost">Paste</button>
        <button type="button" className="btn btn-primary" onClick={addToQueue}>
          Add to queue
        </button>
      </section>

      <section className="panel form-grid">
        <div className="field">
          <label>Destination</label>
          <div className="field-inline">
            <input
              type="text"
              className="input"
              value={destination}
              onChange={(event) => setDestination(event.currentTarget.value)}
            />
            <button type="button" className="btn btn-ghost">Browse</button>
          </div>
        </div>
        <div className="field">
          <label>Custom file name (single download only)</label>
          <input
            type="text"
            className="input"
            placeholder="Optional file name"
            value={fileName}
            onChange={(event) => setFileName(event.currentTarget.value)}
          />
        </div>
        <div className="field field-2col">
          <div>
            <label>Speed preset</label>
            <select
              className="input select"
              value={speedPreset}
              onChange={(event) => setSpeedPreset(event.currentTarget.value)}
            >
              <option>Balanced</option>
              <option>High speed</option>
              <option>Low traffic</option>
            </select>
          </div>
          <div>
            <label>Max connections per server</label>
            <input
              type="number"
              min={1}
              max={32}
              className="input"
              value={maxConnections}
              onChange={(event) => setMaxConnections(Number(event.currentTarget.value || 1))}
            />
          </div>
        </div>
      </section>

      <section className="panel auth-card">
        <div className="section-head">
          <h2>Authentication</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={continueDownload}
              onChange={(event) => setContinueDownload(event.currentTarget.checked)}
            />
            Continue / Resume (-c)
          </label>
        </div>
        <div className="field field-2col">
          <div>
            <label>Auth mode</label>
            <select
              className="input select"
              value={authMode}
              onChange={(event) => setAuthMode(event.currentTarget.value as AuthMode)}
            >
              <option value="none">No auth</option>
              <option value="token">Token + headers</option>
              <option value="basic">Login/password</option>
            </select>
          </div>
          <div>
            <label>Extra headers (one per line)</label>
            <input
              type="text"
              className="input"
              placeholder="Header: Value"
              value={extraHeaders}
              onChange={(event) => setExtraHeaders(event.currentTarget.value)}
            />
          </div>
        </div>
        {authMode === "token" ? (
          <div className="field">
            <label>Token</label>
            <input
              type="password"
              className="input"
              placeholder="Access token"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
            />
          </div>
        ) : null}
        {authMode === "basic" ? (
          <div className="field field-2col">
            <div>
              <label>Username</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel progress-card">
        <div className="progress-top">
          <span className="progress-title">Session progress</span>
          <div className="progress-meta">
            <span>{progressPercent.toFixed(0)}%</span>
            <button type="button" className="btn btn-ghost">More</button>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="actions panel">
        <button type="button" className="btn btn-primary" onClick={startQueue}>
          {snapshot.isRunning ? "Running..." : "Start"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={stopQueue}>Stop</button>
        <button type="button" className="btn btn-ghost" onClick={previewCurrentCommand}>
          Preview command
        </button>
        <button type="button" className="btn btn-ghost" onClick={retryFailed}>Retry failed</button>
        <button type="button" className="btn btn-ghost" onClick={removeFailed}>Remove failed</button>
        <button type="button" className="btn btn-ghost" onClick={() => setShowImport((v) => !v)}>
          {showImport ? "Hide import" : "Import .txt list"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={clearLogs}>Clear log</button>
        <button type="button" className="btn btn-ghost" onClick={clearQueue}>Clear queue</button>
      </section>

      {showImport ? (
        <section className="panel import-card">
          <div className="section-head">
            <h2>Batch import</h2>
            <button type="button" className="btn btn-primary" onClick={importFromText}>
              Import now
            </button>
          </div>
          <textarea
            className="input textarea"
            value={importText}
            onChange={(event) => setImportText(event.currentTarget.value)}
            placeholder="One URL per line. Lines starting with # are ignored."
          />
        </section>
      ) : null}

      {previewCommand ? (
        <section className="panel preview-card">
          <div className="section-head">
            <h2>Command preview (masked)</h2>
          </div>
          <pre className="command-preview">{previewCommand}</pre>
        </section>
      ) : null}

      <section className="panel queue-card">
        <div className="section-head">
          <h2>Download queue</h2>
          <span className="section-chip">{snapshot.items.length} items</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>File</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Speed</th>
                <th>ETA</th>
                <th>Total size</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    Queue is empty. Add a link to start.
                  </td>
                </tr>
              ) : (
                snapshot.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input type="checkbox" checked={item.selected} readOnly />
                    </td>
                    <td className="file-col">
                      <div>{item.fileName}</div>
                      <small>{item.url}</small>
                    </td>
                    <td>
                      <span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td>{item.progress.toFixed(0)}%</td>
                    <td>{item.speed}</td>
                    <td>{item.eta}</td>
                    <td>{item.totalSize}</td>
                    <td>{item.priority}</td>
                    <td className="row-actions">
                      {item.status.toLowerCase() === "failed" ? (
                        <button type="button" className="btn btn-mini" onClick={() => retryItem(item.id)}>
                          Retry
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-mini" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel logs-card">
        <div className="section-head">
          <h2>Logs</h2>
        </div>
        <div className="logs-placeholder">
          {actionError ? <div className="log-error">[ERROR] {actionError}</div> : null}
          {snapshot.logs.length === 0 ? (
            <div>[INFO] No logs yet.</div>
          ) : (
            snapshot.logs.map((log) => (
              <div key={`${log.timestamp}-${log.message}`}>
                [{log.level}] {log.message}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
