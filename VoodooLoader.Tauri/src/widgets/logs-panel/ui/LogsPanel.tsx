import type { LogEntry } from "../../../entities/queue/model/types";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./LogsPanel.module.css";

interface LogsPanelProps {
  visible: boolean;
  logs: LogEntry[];
  actionError: string | null;
  logsPanelHeight: number;
  logsPanelRef: React.RefObject<HTMLDivElement | null>;
  onUpdatePanelHeights: () => void;
}

export function LogsPanel({
  visible,
  logs,
  actionError,
  logsPanelHeight,
  logsPanelRef,
  onUpdatePanelHeights,
}: LogsPanelProps) {
  if (!visible) return null;

  return (
    <section className={styles.logsCard}>
      <div className={styles.sectionHead}>
        <Title as="h2" typography="section">
          Logs
        </Title>
      </div>
      <div
        className={styles.logsBox}
        ref={logsPanelRef}
        style={{ "--logs-panel-height": `${logsPanelHeight}px` } as React.CSSProperties}
        onMouseUp={onUpdatePanelHeights}
      >
        {actionError ? <div className={styles.logError}>[ERROR] {actionError}</div> : null}
        {logs.length === 0 ? (
          <div>[INFO] No logs yet.</div>
        ) : (
          logs.map((log) => (
            <div key={`${log.timestamp}-${log.message}`}>
              [{log.level}] {log.message}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
