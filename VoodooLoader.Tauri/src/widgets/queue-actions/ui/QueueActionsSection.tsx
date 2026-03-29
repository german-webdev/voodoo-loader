import { Button } from "../../../shared/ui/button/Button";
import type { QueueSnapshot } from "../../../entities/queue/model/types";
import styles from "./QueueActionsSection.module.css";

interface QueueActionsSectionProps {
  snapshot: QueueSnapshot;
  onStartQueue: () => Promise<void>;
  onStopQueue: () => Promise<void>;
  onPreviewCurrentCommand: () => Promise<void>;
  onClearLogs: () => Promise<void>;
}

export function QueueActionsSection({
  snapshot,
  onStartQueue,
  onStopQueue,
  onPreviewCurrentCommand,
  onClearLogs,
}: QueueActionsSectionProps) {
  return (
    <section className={`${styles.panel} ${styles.actions}`}>
      <Button type="button" variant="primary" onClick={onStartQueue}>
        {snapshot.isRunning ? "Running..." : "Start"}
      </Button>
      <Button type="button" variant="ghost" onClick={onStopQueue}>
        Stop
      </Button>
      <Button type="button" variant="ghost" onClick={onPreviewCurrentCommand}>
        Preview command
      </Button>
      <div className={styles.spacer} />
      <Button type="button" variant="ghost" onClick={onClearLogs}>
        Clear log
      </Button>
    </section>
  );
}
