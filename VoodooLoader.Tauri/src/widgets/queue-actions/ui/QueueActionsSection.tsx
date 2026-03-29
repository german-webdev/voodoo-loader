import { Button } from "../../../shared/ui/button/Button";
import type { QueueSnapshot } from "../../../entities/queue/model/types";
import startPlayIcon from "../../../shared/assets/button-icons/start-play.png";
import stopSquareIcon from "../../../shared/assets/button-icons/stop-square.png";
import pauseBarsIcon from "../../../shared/assets/button-icons/pause-bars.png";
import styles from "./QueueActionsSection.module.css";

interface QueueActionsSectionProps {
  snapshot: QueueSnapshot;
  onStartQueue: () => Promise<void>;
  onPauseQueue: () => Promise<void>;
  onStopQueue: () => Promise<void>;
  onPreviewCurrentCommand: () => Promise<void>;
  onClearLogs: () => Promise<void>;
}

export function QueueActionsSection({
  snapshot,
  onStartQueue,
  onPauseQueue,
  onStopQueue,
  onPreviewCurrentCommand,
  onClearLogs,
}: QueueActionsSectionProps) {
  return (
    <section className={`${styles.panel} ${styles.actions}`}>
      <Button
        type="button"
        variant="primary"
        className={styles.iconButton}
        aria-label="Start queue"
        title="Start"
        onClick={onStartQueue}
        disabled={snapshot.isRunning}
      >
        <img src={startPlayIcon} alt="" className={styles.iconImage} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={styles.iconButton}
        aria-label="Pause queue"
        title="Pause"
        onClick={onPauseQueue}
        disabled={!snapshot.isRunning}
      >
        <img src={pauseBarsIcon} alt="" className={styles.iconImage} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={styles.iconButton}
        aria-label="Stop queue"
        title="Stop"
        onClick={onStopQueue}
        disabled={!snapshot.isRunning}
      >
        <img src={stopSquareIcon} alt="" className={styles.iconImage} />
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
