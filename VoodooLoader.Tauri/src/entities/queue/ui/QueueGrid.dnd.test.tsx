import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import type { QueueItem, QueuePriority } from "../model/types";
import { QueueGrid } from "./QueueGrid";

jest.mock("@dnd-kit/core", () => {
  return {
    DndContext: ({
      children,
      onDragOver,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragOver?: (event: unknown) => void;
      onDragEnd?: (event: unknown) => void;
    }) => (
      <div>
        <button
          type="button"
          data-testid="dnd-trigger-reorder"
          onClick={() => onDragEnd?.({ active: { id: "item-3" }, over: { id: "item-1" } })}
        >
          trigger
        </button>
        <button
          type="button"
          data-testid="dnd-trigger-reorder-fallback-over"
          onClick={() => {
            onDragOver?.({ active: { id: "item-3" }, over: { id: "item-1" } });
            onDragEnd?.({ active: { id: "item-3" }, over: { id: "item-3" } });
          }}
        >
          trigger-fallback
        </button>
        {children}
      </div>
    ),
    PointerSensor: class { },
    KeyboardSensor: class { },
    useSensor: () => ({}),
    useSensors: (...sensors: unknown[]) => sensors,
    closestCenter: () => null,
  };
});

jest.mock("@dnd-kit/sortable", () => {
  const arrayMove = <T,>(list: T[], from: number, to: number): T[] => {
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  };

  return {
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    sortableKeyboardCoordinates: jest.fn(),
    verticalListSortingStrategy: jest.fn(),
    arrayMove,
    useSortable: () => ({
      attributes: { role: "button", tabIndex: 0 },
      listeners: {},
      setNodeRef: jest.fn(),
      setActivatorNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

const queueItems: QueueItem[] = [
  {
    id: "item-1",
    selected: false,
    fileName: "alpha.bin",
    url: "https://example.com/alpha.bin",
    destination: "C:\\Downloads",
    status: "Queued",
    progress: 0,
    speed: "0 MB/s",
    eta: "--",
    totalSize: "1.0 GB",
    priority: "High",
    attempts: 0,
  },
  {
    id: "item-2",
    selected: false,
    fileName: "beta.bin",
    url: "https://example.com/beta.bin",
    destination: "C:\\Downloads",
    status: "Queued",
    progress: 0,
    speed: "0 MB/s",
    eta: "--",
    totalSize: "2.0 GB",
    priority: "Medium",
    attempts: 0,
  },
  {
    id: "item-3",
    selected: false,
    fileName: "gamma.bin",
    url: "https://example.com/gamma.bin",
    destination: "C:\\Downloads",
    status: "Queued",
    progress: 0,
    speed: "0 MB/s",
    eta: "--",
    totalSize: "3.0 GB",
    priority: "Low",
    attempts: 0,
  },
];

describe("QueueGrid dnd behavior", () => {
  test("calls reorder handler with dragged and target ids on drag end", async () => {
    const onReorderItemsByDrag = jest.fn().mockResolvedValue(undefined);
    const onSetDraggedItemId = jest.fn();
    const noopAsync = jest.fn().mockResolvedValue(undefined);

    render(
      <QueueGrid
        items={queueItems}
        draggedItemId={null}
        onSetDraggedItemId={onSetDraggedItemId}
        onReorderItemsByDrag={onReorderItemsByDrag}
        onSetItemSelected={noopAsync}
        onSetItemPriority={(id: string, priority: QueuePriority) => noopAsync(id, priority)}
        onRetryItem={noopAsync}
        onRemoveItem={noopAsync}
        onRowContextMenu={noopAsync}
      />,
    );

    fireEvent.click(screen.getByTestId("dnd-trigger-reorder"));

    expect(onSetDraggedItemId).toHaveBeenCalledWith(null);
    expect(onReorderItemsByDrag).toHaveBeenCalledWith("item-3", "item-1");
  });

  test("uses last valid over id when drag end reports active item as over target", async () => {
    const onReorderItemsByDrag = jest.fn().mockResolvedValue(undefined);
    const onSetDraggedItemId = jest.fn();
    const noopAsync = jest.fn().mockResolvedValue(undefined);

    render(
      <QueueGrid
        items={queueItems}
        draggedItemId={null}
        onSetDraggedItemId={onSetDraggedItemId}
        onReorderItemsByDrag={onReorderItemsByDrag}
        onSetItemSelected={noopAsync}
        onSetItemPriority={(id: string, priority: QueuePriority) => noopAsync(id, priority)}
        onRetryItem={noopAsync}
        onRemoveItem={noopAsync}
        onRowContextMenu={noopAsync}
      />,
    );

    fireEvent.click(screen.getByTestId("dnd-trigger-reorder-fallback-over"));

    expect(onSetDraggedItemId).toHaveBeenCalledWith(null);
    expect(onReorderItemsByDrag).toHaveBeenCalledWith("item-3", "item-1");
  });

  test("derives display file name from URL when it has trailing slash and query", () => {
    const noopAsync = jest.fn().mockResolvedValue(undefined);

    render(
      <QueueGrid
        items={[
          {
            ...queueItems[0],
            id: "item-url-trailing-slash",
            fileName: "",
            url: "https://example.com/models/real-file.safetensors/?token=abc#fragment",
          },
        ]}
        draggedItemId={null}
        onSetDraggedItemId={jest.fn()}
        onReorderItemsByDrag={noopAsync}
        onSetItemSelected={noopAsync}
        onSetItemPriority={(id: string, priority: QueuePriority) => noopAsync(id, priority)}
        onRetryItem={noopAsync}
        onRemoveItem={noopAsync}
        onRowContextMenu={noopAsync}
      />,
    );

    expect(screen.getByTestId("queue-file-name-item-url-trailing-slash")).toHaveTextContent(
      "real-file.safetensors",
    );
  });
});
