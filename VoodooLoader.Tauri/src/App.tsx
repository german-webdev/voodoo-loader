import "./App.css";

function App() {
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
        />
        <button type="button" className="btn btn-ghost">Paste</button>
        <button type="button" className="btn btn-primary">Add to queue</button>
      </section>

      <section className="panel form-grid">
        <div className="field">
          <label>Destination</label>
          <div className="field-inline">
            <input
              type="text"
              className="input"
              defaultValue="C:\\Downloads\\VoodooLoader"
            />
            <button type="button" className="btn btn-ghost">Browse</button>
          </div>
        </div>
        <div className="field">
          <label>Custom file name (single download only)</label>
          <input type="text" className="input" placeholder="Optional file name" />
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
          <button type="button" className="btn btn-ghost">More</button>
        </div>
        <div className="progress-track">
          <div className="progress-fill" />
        </div>
      </section>

      <section className="actions panel">
        <button type="button" className="btn btn-primary">Start</button>
        <button type="button" className="btn btn-ghost">Stop</button>
        <button type="button" className="btn btn-ghost">Preview command</button>
        <button type="button" className="btn btn-ghost">Clear log</button>
      </section>

      <section className="panel queue-card">
        <div className="section-head">
          <h2>Download queue</h2>
          <span className="section-chip">0 items</span>
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
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="empty-row">
                  Queue is empty. Add a link to start.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel logs-card">
        <div className="section-head">
          <h2>Logs</h2>
        </div>
        <div className="logs-placeholder">
          [INFO] Tauri shell initialized. Queue engine is not connected yet.
        </div>
      </section>
    </main>
  );
}

export default App;
