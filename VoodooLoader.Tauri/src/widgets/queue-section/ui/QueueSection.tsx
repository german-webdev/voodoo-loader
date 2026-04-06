import type { QueuePriority, QueueSnapshot } from "../../../entities/queue/model/types";
import { QueueGrid } from "../../../entities/queue/ui/QueueGrid";
import { Checkbox } from "../../../shared/ui/checkbox/Checkbox";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./QueueSection.module.css";
import { useCallback, useEffect, useRef } from "react";

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
  const resizeStateRef = useRef<{
    startY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);

  const readRootCssPixels = useCallback((variable: string, fallback: number): number => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, []);

  const onPanelResizeMove = useCallback((event: PointerEvent) => {
    const state = resizeStateRef.current;
    const panel = queuePanelRef.current;
    if (!state || !panel) {
      return;
    }

    const nextHeight = Math.round(
      Math.max(state.minHeight, Math.min(state.startHeight + (event.clientY - state.startY), state.maxHeight)),
    );
    panel.style.setProperty("--queue-panel-height", `${nextHeight}px`);
  }, [queuePanelRef]);

  const stopPanelResize = useCallback(() => {
    resizeStateRef.current = null;
    window.removeEventListener("pointermove", onPanelResizeMove);
    window.removeEventListener("pointerup", stopPanelResize);
    window.removeEventListener("pointercancel", stopPanelResize);
    onUpdatePanelHeights();
  }, [onPanelResizeMove, onUpdatePanelHeights]);

  const onPanelResizeStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const panel = queuePanelRef.current;
      if (!panel) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const minHeight = readRootCssPixels("--size-table-min-height", 160);
      const maxHeight = readRootCssPixels("--size-grid-body-max-height", 440);

      resizeStateRef.current = {
        startY: event.clientY,
        startHeight: panel.offsetHeight,
        minHeight,
        maxHeight,
      };

      window.addEventListener("pointermove", onPanelResizeMove);
      window.addEventListener("pointerup", stopPanelResize);
      window.addEventListener("pointercancel", stopPanelResize);
    },
    [onPanelResizeMove, queuePanelRef, readRootCssPixels, stopPanelResize],
  );

  useEffect(() => stopPanelResize, [stopPanelResize]);

  return (
    <section className={styles.queueCard} onContextMenu={onQueueContextMenu}>
      <div className={styles.sectionHead}>
        <Title as="h2" typography="section">
          Download queue
        </Title>
      </div>

      <div
        className={styles.resizable}
        ref={queuePanelRef}
        style={{ "--queue-panel-height": `${queuePanelHeight}px` } as React.CSSProperties}
      >
        <QueueGrid
          items={snapshot.items}
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

      <div className={styles.queueFooter}>
        <label className={styles.selectAll}>
          <Checkbox
            checked={snapshot.items.length > 0 && selectedCount === snapshot.items.length}
            onChange={(event) => {
              void onSetAllSelected(event.currentTarget.checked);
            }}
          />
          Select all
        </label>
        <span className={styles.queueMeta}>{selectedCount} selected</span>
        <span className={styles.queueMeta}>{snapshot.items.length} items</span>
      </div>

      <button
        type="button"
        className={styles.resizeEdgeHandle}
        aria-label="Resize queue panel"
        onPointerDown={onPanelResizeStart}
      />
      <button
        type="button"
        className={styles.resizeCornerHandle}
        aria-label="Resize queue panel corner"
        onPointerDown={onPanelResizeStart}
      />
    </section>
  );
}
