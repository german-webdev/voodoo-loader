import type { QueuePriority, QueueSnapshot } from "../../../entities/queue/model/types";
import { QueueGrid } from "../../../entities/queue/ui/QueueGrid";
import { Checkbox } from "../../../shared/ui/checkbox/Checkbox";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./QueueSection.module.css";

interface QueueSectionProps {
  snapshot: QueueSnapshot;
  selectedCount: number;
  draggedItemId: string | null;
  queuePanelHeight: number;
  queuePanelRef: React.RefObject<HTMLDivElement | null>;
  onUpdatePanelHeights: () => void;
  onSetDraggedItemId: (id: string | null) => void;
  onReorderItemsByDrag: (draggedId: string, targetId: string) => Promise<void>;
  onSetAllSelected: (selected: boolean) => Promise<void>;
  onSetItemSelected: (id: string, selected: boolean) => Promise<void>;
  onSetItemPriority: (id: string, priority: QueuePriority) => Promise<void>;
  onRetryItem: (id: string) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  onQueueContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onRowContextMenu: (event: React.MouseEvent<HTMLElement>, itemId: string) => Promise<void>;
}

export function QueueSection({
  snapshot,
  selectedCount,
  draggedItemId,
  queuePanelHeight,
  queuePanelRef,
  onUpdatePanelHeights,
  onSetDraggedItemId,
  onReorderItemsByDrag,
  onSetAllSelected,
  onSetItemSelected,
  onSetItemPriority,
  onRetryItem,
  onRemoveItem,
  onQueueContextMenu,
  onRowContextMenu,
}: QueueSectionProps) {
  return (
    <section className={styles.queueCard} onContextMenu={onQueueContextMenu}>
      <div className={styles.sectionHead}>
        <Title as="h2" typography="section">
          Download queue
        </Title>
        <div className={styles.queueMeta}>{snapshot.items.length} items</div>
      </div>

      <div className={styles.queueToolbar}>
        <label className={styles.selectAll}>
          <Checkbox
            checked={snapshot.items.length > 0 && selectedCount === snapshot.items.length}
            onChange={(event) => {
              void onSetAllSelected(event.currentTarget.checked);
            }}
          />
          Select all
        </label>
        <span>{selectedCount} selected</span>
      </div>

      <div
        className={styles.resizable}
        ref={queuePanelRef}
        style={{ "--queue-panel-height": `${queuePanelHeight}px` } as React.CSSProperties}
        onMouseUp={onUpdatePanelHeights}
      >
        <QueueGrid
          items={snapshot.items}
          selectedCount={selectedCount}
          draggedItemId={draggedItemId}
          onSetDraggedItemId={onSetDraggedItemId}
          onReorderItemsByDrag={onReorderItemsByDrag}
          onSetItemSelected={onSetItemSelected}
          onSetItemPriority={onSetItemPriority}
          onRetryItem={onRetryItem}
          onRemoveItem={onRemoveItem}
          onRowContextMenu={onRowContextMenu}
        />
      </div>
    </section>
  );
}
