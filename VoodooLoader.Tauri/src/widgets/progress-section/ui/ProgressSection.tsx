import type { CSSProperties } from "react";
import { formatMb } from "../../../shared/lib/numbers";
import { Button } from "../../../shared/ui/button/Button";
import type { ProgressStats, QueueSnapshot } from "../../../entities/queue/model/types";
import styles from "./ProgressSection.module.css";

interface ProgressSectionProps {
  snapshot: QueueSnapshot;
  progressStats: ProgressStats;
  showProgressDetails: boolean;
  onToggleDetails: () => void;
}

export function ProgressSection({
  snapshot,
  progressStats,
  showProgressDetails,
  onToggleDetails,
}: ProgressSectionProps) {
  const progressStyle = {
    "--progress-fill-width": `${Math.max(0, Math.min(100, progressStats.progressPercent)).toFixed(1)}%`,
  } as CSSProperties;

  return (
    <section className={styles.panel}>
      <div className={styles.progressTop}>
        <span className={styles.progressTitle}>Progress</span>
        <Button
          type="button"
          variant="ghost"
          className={styles.compactButton}
          onClick={onToggleDetails}
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
            Speed: {progressStats.active?.speed || "0 MB/s"} | ETA: {progressStats.active?.eta || "--"}
          </div>
        </div>
      ) : null}
    </section>
  );
}
