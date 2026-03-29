import { expect, test, type Locator, type Page } from "@playwright/test";

interface MockQueueItem {
  id: string;
  url: string;
  destination: string;
  fileName: string;
  status: "Queued" | "Downloading" | "Completed" | "Failed" | "Canceled";
  progress: number;
  speed: string;
  eta: string;
  totalSize: string;
  priority: "High" | "Medium" | "Low";
  selected: boolean;
}

interface MockSnapshot {
  isRunning: boolean;
  logs: { timestamp: string; level: string; message: string }[];
  items: MockQueueItem[];
}

function withTauriMocks() {
  const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const state: { snapshot: MockSnapshot } = {
    snapshot: {
      isRunning: false,
      logs: [
        {
          timestamp: "2026-03-30T01:00:00.000Z",
          level: "INFO",
          message: "Queue behavior mock is active.",
        },
      ],
      items: [
        {
          id: "item-1",
          url: "https://example.com/alpha.bin",
          destination: "C:\\Downloads\\VoodooLoader",
          fileName: "alpha.bin",
          status: "Queued",
          progress: 0,
          speed: "0 MB/s",
          eta: "--",
          totalSize: "1.0 GB",
          priority: "High",
          selected: false,
        },
        {
          id: "item-2",
          url: "https://example.com/beta.bin",
          destination: "C:\\Downloads\\VoodooLoader",
          fileName: "beta.bin",
          status: "Queued",
          progress: 0,
          speed: "0 MB/s",
          eta: "--",
          totalSize: "2.0 GB",
          priority: "Medium",
          selected: false,
        },
        {
          id: "item-3",
          url: "https://example.com/gamma.bin",
          destination: "C:\\Downloads\\VoodooLoader",
          fileName: "gamma.bin",
          status: "Queued",
          progress: 0,
          speed: "0 MB/s",
          eta: "--",
          totalSize: "3.0 GB",
          priority: "Low",
          selected: false,
        },
      ],
    },
  };

  const tauriInternals = {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      switch (cmd) {
        case "queue_snapshot":
          return deepClone(state.snapshot);
        case "set_queue_item_selected": {
          const id = String(args?.id ?? "");
          const selected = Boolean(args?.selected);
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.id === id ? { ...item, selected } : item,
          );
          return deepClone(state.snapshot);
        }
        case "set_queue_item_priority": {
          const id = String(args?.id ?? "");
          const priority = String(args?.priority ?? "Medium") as MockQueueItem["priority"];
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.id === id ? { ...item, priority } : item,
          );
          return deepClone(state.snapshot);
        }
        case "set_all_queue_items_selected":
        case "sort_queue":
        case "start_queue":
        case "stop_queue":
        case "pause_queue":
        case "clear_logs":
        case "clear_queue":
        case "remove_queue_item":
        case "remove_selected_items":
        case "remove_failed_items":
        case "retry_selected_items":
        case "retry_failed_items":
        case "retry_queue_item":
          return deepClone(state.snapshot);
        case "plugin:event|listen":
          return 1;
        case "plugin:event|unlisten":
        case "plugin:event|emit":
        case "plugin:event|emit_to":
          return null;
        default:
          return null;
      }
    },
    transformCallback: (() => {
      let callbackId = 1;
      return () => {
        callbackId += 1;
        return callbackId;
      };
    })(),
    unregisterCallback: () => void 0,
    convertFileSrc: (filePath: string) => filePath,
  };

  (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = tauriInternals;
  (window as unknown as { __TAURI_EVENT_PLUGIN_INTERNALS__: unknown }).__TAURI_EVENT_PLUGIN_INTERNALS__ =
    {
      unregisterListener: () => void 0,
    };

  localStorage.clear();
}

async function pointerDragBy(page: Page, source: Locator, deltaX: number) {
  const sourceBox = await source.boundingBox();
  if (!sourceBox) {
    throw new Error("Could not calculate resize geometry.");
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY, { steps: 20 });
  await page.mouse.up();
}

async function headerWidth(locator: Locator): Promise<number> {
  return locator.evaluate((node) => node.getBoundingClientRect().width);
}

test.describe("queue grid behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(withTauriMocks);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Download queue", exact: true })).toBeVisible();
  });

  test("resizes status column and respects min/max clamp", async ({ page }) => {
    const statusHead = page.getByTestId("queue-head-status");
    const statusHandle = page.getByTestId("queue-resize-status");

    const initialWidth = await headerWidth(statusHead);

    await pointerDragBy(page, statusHandle, 160);
    const expandedWidth = await headerWidth(statusHead);
    expect(expandedWidth).toBeGreaterThan(initialWidth);

    await pointerDragBy(page, statusHandle, 2600);
    const maxWidth = await headerWidth(statusHead);
    expect(maxWidth).toBeLessThanOrEqual(270);

    await pointerDragBy(page, statusHandle, -2600);
    const minWidth = await headerWidth(statusHead);
    expect(minWidth).toBeGreaterThanOrEqual(90);
  });

  test("keeps header fixed while page scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 520 });

    const header = page.locator("header");
    await expect(header).toBeVisible();

    const initialTop = await header.evaluate((node) => node.getBoundingClientRect().top);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(150);
    const afterScrollTop = await header.evaluate((node) => node.getBoundingClientRect().top);

    expect(afterScrollTop).toBeGreaterThanOrEqual(-1);
    expect(afterScrollTop).toBeLessThanOrEqual(1);
    expect(afterScrollTop).toBeLessThanOrEqual(initialTop);
  });
});
