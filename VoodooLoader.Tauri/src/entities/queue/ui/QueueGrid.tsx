import type { CSSProperties } from "react";
import type { QueueItem, QueuePriority } from "../model/types";
import { Button } from "../../../shared/ui/button/Button";
import { Checkbox } from "../../../shared/ui/checkbox/Checkbox";
import { Select } from "../../../shared/ui/select/Select";
import styles from "./QueueGrid.module.css";

interface QueueGridProps {
  items: QueueItem[];
  selectedCount: number;
  draggedItemId: string | null;
  onSetDraggedItemId: (id: string | null) => void;
  onReorderItemsByDrag: (draggedId: string, targetId: string) => Promise<void>;
  onSetItemSelected: (id: string, selected: boolean) => Promise<void>;
  onSetItemPriority: (id: string, priority: QueuePriority) => Promise<void>;
  onRetryItem: (id: string) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  onRowContextMenu: (event: React.MouseEvent<HTMLElement>, itemId: string) => Promise<void>;
}

const rowStyle = {
  "--queue-grid-columns":
    "var(--size-queue-col-select) minmax(var(--size-queue-col-file-min), 1fr) var(--size-queue-col-status) var(--size-queue-col-progress) var(--size-queue-col-speed) var(--size-queue-col-eta) var(--size-queue-col-total) var(--size-queue-col-priority) var(--size-queue-col-action)",
} as CSSProperties;

export function QueueGrid({
  items,
  selectedCount,
  draggedItemId,
  onSetDraggedItemId,
  onReorderItemsByDrag,
  onSetItemSelected,
  onSetItemPriority,
  onRetryItem,
  onRemoveItem,
  onRowContextMenu,
}: QueueGridProps) {
  return (
    <div className={styles.gridRoot}>
      <div className={styles.gridHead} style={rowStyle}>
        <div>Select</div>
        <div>File</div>
        <div>Status</div>
        <div>Progress</div>
        <div>Speed</div>
        <div>ETA</div>
        <div>Total size</div>
        <div>Priority</div>
        <div>Action</div>
      </div>

      <div className={styles.gridBody}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>Queue is empty. Add a link to start.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={styles.gridRow}
              style={rowStyle}
              draggable
              onContextMenu={(event) => {
                void onRowContextMenu(event, item.id);
              }}
              onDragStart={(event) => {
                onSetDraggedItemId(item.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData("text/plain") || draggedItemId;
                if (draggedId) {
                  void onReorderItemsByDrag(draggedId, item.id);
                }
                onSetDraggedItemId(null);
              }}
              onDragEnd={() => onSetDraggedItemId(null)}
            >
              <div className={styles.cell}>
                <Checkbox
                  checked={item.selected}
                  onChange={(event) => {
                    void onSetItemSelected(item.id, event.currentTarget.checked);
                  }}
                />
              </div>

              <div className={styles.fileCell}>
                <div className={styles.fileName}>{item.fileName}</div>
                <div className={styles.fileUrl}>{item.url}</div>
              </div>

              <div className={styles.cell}>
                <span className={styles.status} data-status={item.status.toLowerCase()}>
                  {item.status}
                </span>
              </div>

              <div className={styles.cell}>{item.progress.toFixed(0)}%</div>
              <div className={styles.cell}>{item.speed}</div>
              <div className={styles.cell}>{item.eta}</div>
              <div className={styles.cell}>{item.totalSize}</div>

              <div className={styles.cell}>
                <Select
                  className={styles.prioritySelect}
                  value={item.priority}
                  onChange={(event) => {
                    void onSetItemPriority(item.id, event.currentTarget.value as QueuePriority);
                  }}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </Select>
              </div>

              <div className={styles.actionsCell}>
                {item.status.toLowerCase() === "failed" ||
                item.status.toLowerCase() === "canceled" ? (
                  <Button type="button" variant="mini" onClick={() => void onRetryItem(item.id)}>
                    Retry
                  </Button>
                ) : null}
                <Button type="button" variant="mini" onClick={() => void onRemoveItem(item.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footerMeta}>
        <span>{items.length} items</span>
        <span>{selectedCount} selected</span>
      </div>
    </div>
  );
}
