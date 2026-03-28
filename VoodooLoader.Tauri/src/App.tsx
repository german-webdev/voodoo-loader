import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";

type QueueStatus = "Queued" | "Downloading" | "Completed" | string;

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

const EMPTY_SNAPSHOT: QueueSnapshot = {
  isRunning: false,
  items: [],
  logs: [],
};

function App() {
  const [urlInput, setUrlInput] = useState("");
  const [destination, setDestination] = useState("C:\\Downloads\\VoodooLoader");
  const [fileName, setFileName] = useState("");
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY_SNAPSHOT);
  const [actionError, setActionError] = useState<string | null>(null);

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
        <div className="field">
          <label>Speed preset</label>
          <select className="input select">
            <option>Balanced</option>
            <option>High speed</option>
            <option>Low traffic</option>
          </select>
        </div>
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
        <button type="button" className="btn btn-ghost">Preview command</button>
        <button type="button" className="btn btn-ghost" onClick={clearLogs}>Clear log</button>
        <button type="button" className="btn btn-ghost" onClick={clearQueue}>Clear queue</button>
      </section>

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
                    <td>
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
