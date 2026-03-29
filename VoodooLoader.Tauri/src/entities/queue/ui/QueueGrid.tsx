import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToFirstScrollableAncestor,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
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

const COLUMN_MIN_WIDTH_BUFFER_PX = 12;

function parsePixelValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureNodeIntrinsicWidth(node: HTMLElement): number {
  const computedStyle = getComputedStyle(node);
  const inlinePadding =
    parsePixelValue(computedStyle.paddingLeft) + parsePixelValue(computedStyle.paddingRight);

  const visibleChildren = Array.from(node.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute("data-resize-handle"),
  );

  const gap = parsePixelValue(computedStyle.columnGap || computedStyle.gap);
  const childrenWidth = visibleChildren.reduce((acc, child, index) => {
    const next = acc + Math.ceil(child.scrollWidth);
    return index > 0 ? next + gap : next;
  }, 0);

  if (childrenWidth > 0) {
    return childrenWidth + inlinePadding;
  }

  return Math.ceil(node.scrollWidth) + inlinePadding;
}

function readRootPixelVariable(variableName: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildGridColumnsTemplate(
  columnWidths: Partial<Record<QueueColumnId, number>>,
): string {
  return QUEUE_COLUMNS.map((column) => {
    const width = columnWidths[column.id];
    if (typeof width === "number") {
      return `${width}px`;
    }

    return column.defaultTemplate;
  }).join(" ");
}

function measureColumnContentMinWidth(rootElement: HTMLElement, columnId: QueueColumnId): number {
  const nodes = rootElement.querySelectorAll<HTMLElement>(`[data-col="${columnId}"]`);
  let measured = 0;

  nodes.forEach((node) => {
    measured = Math.max(measured, measureNodeIntrinsicWidth(node) + COLUMN_MIN_WIDTH_BUFFER_PX);
  });

  return measured;
}

function sanitizeCandidateFileName(value: string): string {
  const withoutFragment = value.split("#")[0] ?? value;
  const withoutQuery = withoutFragment.split("?")[0] ?? withoutFragment;
  const normalized = withoutQuery.trim().replace(/\\+$/, "");
  const baseName = normalized.includes("/")
    ? normalized.substring(normalized.lastIndexOf("/") + 1)
    : normalized;

  if (!baseName) {
    return "";
  }

  try {
    return decodeURIComponent(baseName);
  } catch {
    return baseName;
  }
}

function resolveDisplayFileName(item: QueueItem): string {
  const fromItem = sanitizeCandidateFileName(item.fileName);
  if (fromItem) {
    return fromItem;
  }

  const fromUrl = sanitizeCandidateFileName(item.url);
  return fromUrl || "download.bin";
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
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
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
      data-testid={`queue-row-${item.id}`}
      {...listeners}
      onContextMenu={(event) => {
        void onRowContextMenu(event, item.id);
      }}
    >
      <div className={styles.cell} data-col="select">
        <Checkbox
          checked={item.selected}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            void onSetItemSelected(item.id, event.currentTarget.checked);
          }}
        />
      </div>

      <div className={styles.fileCell} data-col="file">
        <div className={styles.fileName} data-testid={`queue-file-name-${item.id}`}>
          {resolveDisplayFileName(item)}
        </div>
        <div className={styles.fileUrl}>{item.url}</div>
      </div>

      <div className={styles.cell} data-col="status">
        <span className={styles.status} data-status={item.status.toLowerCase()}>
          {item.status}
        </span>
      </div>

      <div className={styles.cell} data-col="progress">
        <span>{item.progress.toFixed(0)}%</span>
      </div>
      <div className={styles.cell} data-col="speed">
        <span>{item.speed}</span>
      </div>
      <div className={styles.cell} data-col="eta">
        <span>{item.eta}</span>
      </div>
      <div className={styles.cell} data-col="total">
        <span>{item.totalSize}</span>
      </div>

      <div className={styles.cell} data-col="priority">
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

      <div className={styles.actionsCell} data-col="action">
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
  const lastValidOverIdRef = useRef<string | null>(null);
  const gridRootRef = useRef<HTMLDivElement | null>(null);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<QueueColumnId, number>>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [optimisticOrderIds, setOptimisticOrderIds] = useState<string[] | null>(null);

  const serverOrderIds = useMemo(() => items.map((item) => item.id), [items]);

  const displayedOrderIds = useMemo(() => {
    if (!optimisticOrderIds) {
      return serverOrderIds;
    }

    const sameSet =
      optimisticOrderIds.length === serverOrderIds.length &&
      optimisticOrderIds.every((id) => serverOrderIds.includes(id));

    return sameSet ? optimisticOrderIds : serverOrderIds;
  }, [optimisticOrderIds, serverOrderIds]);

  const displayedItems = useMemo(() => {
    if (displayedOrderIds === serverOrderIds) {
      return items;
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    return displayedOrderIds.map((id) => byId.get(id)).filter((item): item is QueueItem => !!item);
  }, [displayedOrderIds, items, serverOrderIds]);

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

  const sortableIds = displayedOrderIds;

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
      const rootElement = headerCell.closest(`.${styles.gridRoot}`);
      const contentMinWidth =
        column.id !== "file" && rootElement instanceof HTMLElement
          ? measureColumnContentMinWidth(rootElement, column.id)
          : 0;
      const minWidth = Math.max(
        readRootPixelVariable(column.minWidthVar, column.minWidthFallback),
        contentMinWidth,
      );
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
      lastValidOverIdRef.current = null;
      setOptimisticOrderIds(serverOrderIds);
      onSetDraggedItemId(String(event.active.id));
    },
    [onSetDraggedItemId, serverOrderIds],
  );

  const onDragOver = useCallback((event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) {
      return;
    }

    lastValidOverIdRef.current = overId;

    setOptimisticOrderIds((prev) => {
      const source = prev ?? serverOrderIds;
      const oldIndex = source.indexOf(activeId);
      const newIndex = source.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return source;
      }
      return arrayMove(source, oldIndex, newIndex);
    });
  }, [serverOrderIds]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      const commitTargetId =
        overId && overId !== activeId
          ? overId
          : lastValidOverIdRef.current && lastValidOverIdRef.current !== activeId
            ? lastValidOverIdRef.current
            : null;
      onSetDraggedItemId(null);

      if (!commitTargetId) {
        lastValidOverIdRef.current = null;
        setOptimisticOrderIds(null);
        return;
      }
      const oldIndex = sortableIds.indexOf(activeId);
      const newIndex = sortableIds.indexOf(commitTargetId);
      if (oldIndex < 0 || newIndex < 0) {
        lastValidOverIdRef.current = null;
        setOptimisticOrderIds(null);
        return;
      }
      void onReorderItemsByDrag(activeId, commitTargetId).finally(() => {
        lastValidOverIdRef.current = null;
        setOptimisticOrderIds(null);
      });
    },
    [onReorderItemsByDrag, onSetDraggedItemId, sortableIds],
  );

  const onDragCancel = useCallback(() => {
    lastValidOverIdRef.current = null;
    setOptimisticOrderIds(null);
    onSetDraggedItemId(null);
  }, [onSetDraggedItemId]);

  return (
    <div className={styles.gridScroller}>
      <div
        ref={gridRootRef}
        className={styles.gridRoot}
        data-resizing={isResizing ? "true" : "false"}
      >
        <div className={styles.gridHead} style={rowStyle}>
          {QUEUE_COLUMNS.map((column, index) => (
            <div
              key={column.id}
              className={styles.headCell}
              data-testid={`queue-head-${column.id}`}
              data-col={column.id}
            >
              <span>{column.label}</span>
              {index < QUEUE_COLUMNS.length - 1 ? (
                <button
                  type="button"
                  className={styles.resizeHandle}
                  data-resize-handle="true"
                  data-testid={`queue-resize-${column.id}`}
                  aria-label={`Resize ${column.label} column`}
                  tabIndex={-1}
                  onPointerDown={(event) => onResizePointerDown(column, event)}
                />
              ) : null}
            </div>
          ))}
        </div>

        <DndContext
          sensors={sensors}
          modifiers={[
            restrictToVerticalAxis,
            restrictToFirstScrollableAncestor,
            restrictToParentElement,
          ]}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className={styles.gridBody}>
              {displayedItems.length === 0 ? (
                <div className={styles.emptyState}>Queue is empty. Add a link to start.</div>
              ) : (
                displayedItems.map((item) => (
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
