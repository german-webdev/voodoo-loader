import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type * as React from "react";
import type { QueueItem, QueuePriority } from "../model/types";
import { Button } from "../../../shared/ui/button/Button";
import { Checkbox } from "../../../shared/ui/checkbox/Checkbox";
import { Select } from "../../../shared/ui/select/Select";
import retryRefreshIcon from "../../../shared/assets/button-icons/retry-refresh.png";
import removeXIcon from "../../../shared/assets/button-icons/remove-x.png";
import styles from "./QueueGrid.module.css";

type QueueColumnId =
  | "select"
  | "file"
  | "status"
  | "progress"
  | "speed"
  | "eta"
  | "total"
  | "priority"
  | "action";

interface QueueColumnDefinition {
  id: QueueColumnId;
  label: string;
  defaultTemplate: string;
  minWidthVar: string;
  maxWidthVar: string;
  minWidthFallback: number;
  maxWidthFallback: number;
}

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

const DRAG_ACTIVATION_DISTANCE = 6;

const QUEUE_COLUMNS: QueueColumnDefinition[] = [
  {
    id: "select",
    label: "Select",
    defaultTemplate: "var(--size-queue-col-select)",
    minWidthVar: "--size-queue-col-select-min",
    maxWidthVar: "--size-queue-col-select-max",
    minWidthFallback: 52,
    maxWidthFallback: 120,
  },
  {
    id: "file",
    label: "File",
    defaultTemplate: "minmax(var(--size-queue-col-file-min), 1fr)",
    minWidthVar: "--size-queue-col-file-min-limit",
    maxWidthVar: "--size-queue-col-file-max",
    minWidthFallback: 220,
    maxWidthFallback: 780,
  },
  {
    id: "status",
    label: "Status",
    defaultTemplate: "var(--size-queue-col-status)",
    minWidthVar: "--size-queue-col-status-min",
    maxWidthVar: "--size-queue-col-status-max",
    minWidthFallback: 96,
    maxWidthFallback: 260,
  },
  {
    id: "progress",
    label: "Progress",
    defaultTemplate: "var(--size-queue-col-progress)",
    minWidthVar: "--size-queue-col-progress-min",
    maxWidthVar: "--size-queue-col-progress-max",
    minWidthFallback: 84,
    maxWidthFallback: 200,
  },
  {
    id: "speed",
    label: "Speed",
    defaultTemplate: "var(--size-queue-col-speed)",
    minWidthVar: "--size-queue-col-speed-min",
    maxWidthVar: "--size-queue-col-speed-max",
    minWidthFallback: 90,
    maxWidthFallback: 220,
  },
  {
    id: "eta",
    label: "ETA",
    defaultTemplate: "var(--size-queue-col-eta)",
    minWidthVar: "--size-queue-col-eta-min",
    maxWidthVar: "--size-queue-col-eta-max",
    minWidthFallback: 68,
    maxWidthFallback: 180,
  },
  {
    id: "total",
    label: "Total size",
    defaultTemplate: "var(--size-queue-col-total)",
    minWidthVar: "--size-queue-col-total-min",
    maxWidthVar: "--size-queue-col-total-max",
    minWidthFallback: 96,
    maxWidthFallback: 260,
  },
  {
    id: "priority",
    label: "Priority",
    defaultTemplate: "var(--size-queue-col-priority)",
    minWidthVar: "--size-queue-col-priority-min",
    maxWidthVar: "--size-queue-col-priority-max",
    minWidthFallback: 108,
    maxWidthFallback: 220,
  },
  {
    id: "action",
    label: "Action",
    defaultTemplate: "var(--size-queue-col-action)",
    minWidthVar: "--size-queue-col-action-min",
    maxWidthVar: "--size-queue-col-action-max",
    minWidthFallback: 118,
    maxWidthFallback: 300,
  },
];

interface ActiveResizeState {
  columnId: QueueColumnId;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
}

function readRootPixelVariable(variableName: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildGridColumnsTemplate(columnWidths: Partial<Record<QueueColumnId, number>>): string {
  return QUEUE_COLUMNS.map((column) => {
    const width = columnWidths[column.id];
    if (typeof width === "number") {
      return `${width}px`;
    }
    return column.defaultTemplate;
  }).join(" ");
}

interface SortableQueueRowProps {
  item: QueueItem;
  activeDraggedItemId: string | null;
  rowStyle: CSSProperties;
  onSetItemSelected: (id: string, selected: boolean) => Promise<void>;
  onSetItemPriority: (id: string, priority: QueuePriority) => Promise<void>;
  onRetryItem: (id: string) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  onRowContextMenu: (event: React.MouseEvent<HTMLElement>, itemId: string) => Promise<void>;
}

function SortableQueueRow({
  item,
  activeDraggedItemId,
  rowStyle,
  onSetItemSelected,
  onSetItemPriority,
  onRetryItem,
  onRemoveItem,
  onRowContextMenu,
}: SortableQueueRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.id,
    });

  const sortableStyle: CSSProperties = {
    ...rowStyle,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowClassName =
    isDragging || activeDraggedItemId === item.id
      ? `${styles.gridRow} ${styles.gridRowDragging}`
      : styles.gridRow;

  return (
    <div
      ref={setNodeRef}
      className={rowClassName}
      style={sortableStyle}
      onContextMenu={(event) => {
        void onRowContextMenu(event, item.id);
      }}
    >
      <div className={styles.cell}>
        <div
          className={styles.dragHandle}
          ref={setActivatorNodeRef}
          aria-label={`Reorder ${item.fileName}`}
          {...attributes}
          {...listeners}
        >
          <span className={styles.dragDots}>::</span>
        </div>
        <Checkbox
          checked={item.selected}
          onPointerDown={(event) => event.stopPropagation()}
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
          onPointerDown={(event) => event.stopPropagation()}
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
        {item.status.toLowerCase() === "failed" || item.status.toLowerCase() === "canceled" ? (
          <Button
            type="button"
            variant="mini"
            className={styles.actionIconButton}
            aria-label={`Retry ${item.fileName}`}
            title="Retry"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => void onRetryItem(item.id)}
          >
            <img src={retryRefreshIcon} alt="" className={styles.actionIconImage} />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="mini"
          className={styles.actionIconButton}
          aria-label={`Remove ${item.fileName}`}
          title="Remove"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => void onRemoveItem(item.id)}
        >
          <img src={removeXIcon} alt="" className={styles.actionIconImage} />
        </Button>
      </div>
    </div>
  );
}

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
  const resizeStateRef = useRef<ActiveResizeState | null>(null);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<QueueColumnId, number>>>({});
  const [isResizing, setIsResizing] = useState(false);

  const rowStyle = useMemo(
    () =>
      ({
        "--queue-grid-columns": buildGridColumnsTemplate(columnWidths),
      }) as CSSProperties,
    [columnWidths],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = useMemo(() => items.map((item) => item.id), [items]);

  const onResizePointerMove = useCallback((event: PointerEvent) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const delta = event.clientX - resizeState.startX;
    const rawWidth = resizeState.startWidth + delta;
    const clampedWidth = Math.max(resizeState.minWidth, Math.min(rawWidth, resizeState.maxWidth));
    const nextWidth = Math.round(clampedWidth);

    setColumnWidths((prev) => {
      if (prev[resizeState.columnId] === nextWidth) {
        return prev;
      }
      return { ...prev, [resizeState.columnId]: nextWidth };
    });
  }, []);

  const stopResizing = useCallback(() => {
    resizeStateRef.current = null;
    setIsResizing(false);
    window.removeEventListener("pointermove", onResizePointerMove);
    window.removeEventListener("pointerup", stopResizing);
    window.removeEventListener("pointercancel", stopResizing);
  }, [onResizePointerMove]);

  useEffect(() => stopResizing, [stopResizing]);

  const onResizePointerDown = useCallback(
    (column: QueueColumnDefinition, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const headerCell = event.currentTarget.parentElement;
      if (!headerCell) return;

      const startWidth = headerCell.getBoundingClientRect().width;
      const minWidth = readRootPixelVariable(column.minWidthVar, column.minWidthFallback);
      const maxWidth = readRootPixelVariable(column.maxWidthVar, column.maxWidthFallback);

      resizeStateRef.current = {
        columnId: column.id,
        startX: event.clientX,
        startWidth,
        minWidth,
        maxWidth,
      };

      setIsResizing(true);
      window.addEventListener("pointermove", onResizePointerMove);
      window.addEventListener("pointerup", stopResizing);
      window.addEventListener("pointercancel", stopResizing);
    },
    [onResizePointerMove, stopResizing],
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      onSetDraggedItemId(String(event.active.id));
    },
    [onSetDraggedItemId],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      onSetDraggedItemId(null);

      if (!overId || activeId === overId) return;
      void onReorderItemsByDrag(activeId, overId);
    },
    [onReorderItemsByDrag, onSetDraggedItemId],
  );

  const onDragCancel = useCallback(() => {
    onSetDraggedItemId(null);
  }, [onSetDraggedItemId]);

  return (
    <div className={styles.gridScroller}>
      <div className={styles.gridRoot} data-resizing={isResizing ? "true" : "false"}>
        <div className={styles.gridHead} style={rowStyle}>
          {QUEUE_COLUMNS.map((column) => (
            <div key={column.id} className={styles.headCell}>
              <span>{column.label}</span>
              <button
                type="button"
                className={styles.resizeHandle}
                aria-label={`Resize ${column.label} column`}
                tabIndex={-1}
                onPointerDown={(event) => onResizePointerDown(column, event)}
              />
            </div>
          ))}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className={styles.gridBody}>
              {items.length === 0 ? (
                <div className={styles.emptyState}>Queue is empty. Add a link to start.</div>
              ) : (
                items.map((item) => (
                  <SortableQueueRow
                    key={item.id}
                    item={item}
                    activeDraggedItemId={draggedItemId}
                    rowStyle={rowStyle}
                    onSetItemSelected={onSetItemSelected}
                    onSetItemPriority={onSetItemPriority}
                    onRetryItem={onRetryItem}
                    onRemoveItem={onRemoveItem}
                    onRowContextMenu={onRowContextMenu}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className={styles.footerMeta}>
          <span>{items.length} items</span>
          <span>{selectedCount} selected</span>
        </div>
      </div>
    </div>
  );
}

