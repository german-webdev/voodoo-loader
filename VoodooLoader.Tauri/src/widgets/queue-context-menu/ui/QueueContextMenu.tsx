import type { QueuePriority } from "../../../entities/queue/model/types";
import { Button } from "../../../shared/ui/button/Button";
import styles from "./QueueContextMenu.module.css";

interface QueueContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onRetrySelected: () => Promise<void>;
  onRetryFailed: () => Promise<void>;
  onRemoveSelected: () => Promise<void>;
  onRemoveFailed: () => Promise<void>;
  onClearQueue: () => Promise<void>;
  onOpenSelectedFile: () => Promise<void>;
  onOpenSelectedFolder: () => Promise<void>;
  onSetSelectedPriority: (priority: QueuePriority) => Promise<void>;
}

export function QueueContextMenu({
  visible,
  x,
  y,
  onClose,
  onRetrySelected,
  onRetryFailed,
  onRemoveSelected,
  onRemoveFailed,
  onClearQueue,
  onOpenSelectedFile,
  onOpenSelectedFolder,
  onSetSelectedPriority,
}: QueueContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      className={styles.contextMenu}
      style={
        { "--context-menu-left": `${x}px`, "--context-menu-top": `${y}px` } as React.CSSProperties
      }
    >
      <Button type="button" onClick={() => void onRetrySelected().finally(onClose)}>
        Retry selected
      </Button>
      <Button type="button" onClick={() => void onRetryFailed().finally(onClose)}>
        Retry all failed/canceled
      </Button>
      <Button type="button" onClick={() => void onRemoveSelected().finally(onClose)}>
        Remove selected
      </Button>
      <Button type="button" onClick={() => void onRemoveFailed().finally(onClose)}>
        Remove failed/canceled
      </Button>
      <Button type="button" onClick={() => void onClearQueue().finally(onClose)}>
        Clear queue
      </Button>
      <Button type="button" onClick={() => void onOpenSelectedFile().finally(onClose)}>
        Open file
      </Button>
      <Button type="button" onClick={() => void onOpenSelectedFolder().finally(onClose)}>
        Open folder
      </Button>
      <div className={styles.submenuItem}>
        <Button type="button">Priority &gt;</Button>
        <div className={styles.submenuPopup}>
          <Button type="button" onClick={() => void onSetSelectedPriority("High").finally(onClose)}>
            High
          </Button>
          <Button
            type="button"
            onClick={() => void onSetSelectedPriority("Medium").finally(onClose)}
          >
            Medium
          </Button>
          <Button type="button" onClick={() => void onSetSelectedPriority("Low").finally(onClose)}>
            Low
          </Button>
        </div>
      </div>
    </div>
  );
}
