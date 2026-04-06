import { expect, test, type Locator, type Page } from "@playwright/test";

const screenshotOptions = process.env.CI
  ? ({
    animations: "disabled",
    caret: "hide",
    scale: "css",
    maxDiffPixelRatio: 0.02,
  } as const)
  : ({
    animations: "disabled",
    caret: "hide",
    scale: "css",
  } as const);

function withTauriMocks() {
  const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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

  let idCounter = 10;

  const initialSnapshot: MockSnapshot = {
    isRunning: false,
    logs: [
      {
        timestamp: "2026-03-29T18:00:00.000Z",
        level: "INFO",
        message: "UI visual baseline mock is active.",
      },
    ],
    items: [
      {
        id: "item-failed-1",
        url: "https://example.com/models/failed.ckpt",
        destination: "C:\\Downloads\\VoodooLoader",
        fileName: "failed-model.ckpt",
        status: "Failed",
        progress: 52,
        speed: "0 MB/s",
        eta: "--",
        totalSize: "2.1 GB",
        priority: "High",
        selected: true,
      },
      {
        id: "item-completed-1",
        url: "https://example.com/models/completed.safetensors",
        destination: "C:\\Downloads\\VoodooLoader",
        fileName: "completed-model.safetensors",
        status: "Completed",
        progress: 100,
        speed: "0 MB/s",
        eta: "--",
        totalSize: "4.7 GB",
        priority: "Medium",
        selected: false,
      },
    ],
  };

  const state = {
    snapshot: deepClone(initialSnapshot),
  };

  const tauriInternals = {
    invoke: async (cmd: string, args?: Record<string, unknown>) => {
      switch (cmd) {
        case "queue_snapshot":
          return deepClone(state.snapshot);
        case "add_queue_item": {
          const url = String(args?.url ?? "https://example.com/file.bin");
          const destination = String(args?.destination ?? "C:\\Downloads\\VoodooLoader");
          const fileNameRaw = args?.fileName ? String(args.fileName) : null;
          idCounter += 1;
          state.snapshot.items.unshift({
            id: `item-${idCounter}`,
            url,
            destination,
            fileName: fileNameRaw || `file-${idCounter}.bin`,
            status: "Queued",
            progress: 0,
            speed: "0 MB/s",
            eta: "--",
            totalSize: "unknown",
            priority: "Medium",
            selected: false,
          });
          return deepClone(state.snapshot);
        }
        case "set_queue_item_selected": {
          const id = String(args?.id ?? "");
          const selected = Boolean(args?.selected);
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.id === id ? { ...item, selected } : item,
          );
          return deepClone(state.snapshot);
        }
        case "set_all_queue_items_selected": {
          const selected = Boolean(args?.selected);
          state.snapshot.items = state.snapshot.items.map((item) => ({ ...item, selected }));
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
        case "set_selected_items_priority": {
          const priority = String(args?.priority ?? "Medium") as MockQueueItem["priority"];
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.selected ? { ...item, priority } : item,
          );
          return deepClone(state.snapshot);
        }
        case "remove_queue_item": {
          const id = String(args?.id ?? "");
          state.snapshot.items = state.snapshot.items.filter((item) => item.id !== id);
          return deepClone(state.snapshot);
        }
        case "remove_selected_items":
          state.snapshot.items = state.snapshot.items.filter((item) => !item.selected);
          return deepClone(state.snapshot);
        case "remove_failed_items":
          state.snapshot.items = state.snapshot.items.filter(
            (item) => item.status !== "Failed" && item.status !== "Canceled",
          );
          return deepClone(state.snapshot);
        case "retry_queue_item": {
          const id = String(args?.id ?? "");
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.id === id
              ? { ...item, status: "Queued", progress: 0, speed: "0 MB/s", eta: "--" }
              : item,
          );
          return deepClone(state.snapshot);
        }
        case "retry_failed_items":
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.status === "Failed" || item.status === "Canceled"
              ? { ...item, status: "Queued", progress: 0, speed: "0 MB/s", eta: "--" }
              : item,
          );
          return deepClone(state.snapshot);
        case "retry_selected_items":
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.selected ? { ...item, status: "Queued", progress: 0, speed: "0 MB/s" } : item,
          );
          return deepClone(state.snapshot);
        case "sort_queue":
          return deepClone(state.snapshot);
        case "reorder_queue_item":
          return deepClone(state.snapshot);
        case "start_queue":
          state.snapshot.isRunning = true;
          return deepClone(state.snapshot);
        case "pause_queue":
          state.snapshot.isRunning = false;
          return deepClone(state.snapshot);
        case "stop_queue":
          state.snapshot.isRunning = false;
          state.snapshot.items = state.snapshot.items.map((item) =>
            item.status === "Queued" || item.status === "Downloading"
              ? { ...item, status: "Canceled", speed: "0 MB/s", eta: "--" }
              : item,
          );
          return deepClone(state.snapshot);
        case "clear_queue":
          state.snapshot.items = [];
          return deepClone(state.snapshot);
        case "clear_logs":
          state.snapshot.logs = [];
          return deepClone(state.snapshot);
        case "build_preview_command":
          return `aria2c "${String(args?.input ? (args.input as { url?: string }).url ?? "" : "")}"`;
        case "pick_folder":
          return "C:\\Downloads\\VoodooLoader";
        case "pick_file":
          return "C:\\Tools\\aria2\\aria2c.exe";
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

async function blockByHeading(page: Page, headingText: string): Promise<Locator> {
  const heading = page.getByRole("heading", { name: headingText, exact: true });
  await expect(heading).toBeVisible();
  return heading.locator("xpath=ancestor::section[1]");
}

interface LayoutStabilityResult {
  stable: boolean;
  size: string;
  stableFrames: number;
  attempts: number;
}

async function waitForStableLayout(locator: Locator): Promise<LayoutStabilityResult> {
  return locator.evaluate(async (element) => {
    const readSize = () => {
      const box = element.getBoundingClientRect();
      return `${Math.round(box.width)}x${Math.round(box.height)}`;
    };

    let previous = readSize();
    let stableFrames = 0;
    let attempts = 0;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      attempts = attempt + 1;
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const current = readSize();
      if (current === previous) {
        stableFrames += 1;
        if (stableFrames >= 4) {
          return { stable: true, size: current, stableFrames, attempts };
        }
      } else {
        stableFrames = 0;
        previous = current;
      }
    }

    return { stable: false, size: previous, stableFrames, attempts };
  });
}

async function snapshot(locator: Locator, name: string, options?: { settle?: boolean }) {
  if (options?.settle) {
    await expect(locator).toBeVisible();
    const stability = await waitForStableLayout(locator);
    expect(
      stability.stable,
      `Layout did not stabilize for ${name}; size=${stability.size}, stableFrames=${stability.stableFrames}, attempts=${stability.attempts}`,
    ).toBeTruthy();
    await locator.page().waitForTimeout(120);
  }
  await expect(locator).toHaveScreenshot(name, screenshotOptions);
}

async function waitForVisualAssets(page: Page) {
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForFunction(
    () =>
      Array.from(document.images).every(
        (img) => img.complete && (img.naturalWidth > 0 || img.currentSrc === ""),
      ),
  );
}

test.describe("visual regression", () => {
  test.use({
    viewport: { width: 1365, height: 930 },
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(withTauriMocks);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Download queue", exact: true })).toBeVisible();
    await waitForVisualAssets(page);
  });

  test("captures main screen sections", async ({ page }) => {
    await snapshot(page.locator("header").first(), "block-header.png");

    const addQueueSection = page
      .getByPlaceholder("Paste direct URL here")
      .locator("xpath=ancestor::section[1]");
    await snapshot(addQueueSection, "block-add-to-queue.png");

    await snapshot(await blockByHeading(page, "Download queue"), "block-download-queue.png", { settle: true });
    await snapshot(await blockByHeading(page, "Logs"), "block-logs.png");

    const progressSection = page
      .getByText("Progress", { exact: true })
      .first()
      .locator("xpath=ancestor::section[1]");
    await snapshot(progressSection, "block-progress.png");

    const destinationSection = page
      .getByText("Destination", { exact: true })
      .first()
      .locator("xpath=ancestor::section[1]");
    await snapshot(destinationSection, "block-destination.png");

    const queueActionsSection = page
      .getByRole("button", { name: "Start queue", exact: true })
      .locator("xpath=ancestor::section[1]");
    await snapshot(queueActionsSection, "block-queue-actions.png");
  });

  test("captures empty download queue block", async ({ page }) => {
    await page.getByRole("button", { name: "Downloads", exact: true }).click();
    await page.getByRole("button", { name: "Clear queue", exact: true }).click();
    await expect(page.getByText("Queue is empty. Add a link to start.")).toBeVisible();

    await snapshot(await blockByHeading(page, "Download queue"), "block-download-queue-empty.png", { settle: true });
  });

  test("captures menu popups, context menu and dialogs", async ({ page }) => {
    await page.getByRole("button", { name: "File", exact: true }).click();
    await snapshot(
      page.getByRole("button", { name: "Import .txt", exact: true }).locator("xpath=parent::*"),
      "menu-file.png",
    );

    await page.getByRole("button", { name: "Downloads", exact: true }).click();
    const downloadsPopup = page
      .getByRole("button", { name: "Retry all failed/canceled", exact: true })
      .locator("xpath=parent::*");
    await snapshot(downloadsPopup, "menu-downloads.png");
    await page.getByRole("button", { name: "Priority >", exact: true }).hover();
    await snapshot(
      page.getByRole("button", { name: "High", exact: true }).locator("xpath=parent::*"),
      "menu-downloads-priority-submenu.png",
    );

    await page.getByRole("button", { name: "View", exact: true }).click();
    await snapshot(
      page.getByRole("button", { name: "Sort by priority", exact: true }).locator("xpath=parent::*"),
      "menu-view.png",
    );

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await snapshot(
      page.getByRole("button", { name: "Open settings", exact: true }).locator("xpath=parent::*"),
      "menu-settings.png",
    );
    await page.getByRole("button", { name: "Language >", exact: true }).hover();
    await snapshot(
      page.getByRole("button", { name: "Russian", exact: false }).locator("xpath=parent::*"),
      "menu-settings-language-submenu.png",
    );

    await page.getByRole("button", { name: "Help", exact: true }).click();
    await snapshot(
      page
        .getByRole("button", { name: "Check Voodoo Loader updates", exact: true })
        .locator("xpath=parent::*"),
      "menu-help.png",
    );

    const queueHeading = page.getByRole("heading", { name: "Download queue", exact: true });
    await queueHeading.click({ button: "right" });
    await snapshot(
      page.getByRole("button", { name: "Retry selected", exact: true }).locator("xpath=parent::*"),
      "menu-queue-context.png",
    );

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Open settings", exact: true }).click();
    const settingsDialog = page
      .getByRole("heading", { name: "Settings", exact: true })
      .locator("xpath=ancestor::section[1]");
    await snapshot(settingsDialog, "dialog-settings-no-auth.png");

    const authModeSelect = settingsDialog
      .locator("label", { hasText: "Auth mode" })
      .locator("xpath=ancestor::div[1]")
      .locator("select");

    await authModeSelect.selectOption("token");
    await snapshot(settingsDialog, "dialog-settings-token-auth.png");

    await authModeSelect.selectOption("basic");
    await snapshot(settingsDialog, "dialog-settings-basic-auth.png");

    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page.getByRole("button", { name: "About", exact: true }).click();
    const aboutDialog = page
      .getByRole("heading", { name: "About Voodoo Loader", exact: true })
      .locator("xpath=ancestor::section[1]");
    await snapshot(aboutDialog, "dialog-about.png");
  });

  test("captures primary buttons and icon buttons", async ({ page }) => {
    await snapshot(page.getByRole("button", { name: "File", exact: true }), "button-nav-file.png");
    await snapshot(
      page.getByRole("button", { name: "Downloads", exact: true }),
      "button-nav-downloads.png",
    );
    await snapshot(page.getByRole("button", { name: "View", exact: true }), "button-nav-view.png");
    await snapshot(
      page.getByRole("button", { name: "Settings", exact: true }),
      "button-nav-settings.png",
    );
    await snapshot(page.getByRole("button", { name: "Help", exact: true }), "button-nav-help.png");

    await snapshot(page.getByRole("button", { name: "Paste", exact: true }), "button-paste.png");
    await snapshot(
      page.getByRole("button", { name: "Add to queue", exact: true }),
      "button-add-to-queue.png",
    );
    await snapshot(
      page.getByRole("button", { name: "Browse", exact: true }).first(),
      "button-browse.png",
    );
    await snapshot(page.getByRole("button", { name: "More", exact: true }), "button-more.png");
    await snapshot(
      page.getByRole("button", { name: "Preview command", exact: true }),
      "button-preview-command.png",
    );
    await snapshot(page.getByRole("button", { name: "Clear log", exact: true }), "button-clear-log.png");

    await snapshot(
      page.getByRole("button", { name: "Start queue", exact: true }),
      "button-icon-start.png",
    );
    await snapshot(
      page.getByRole("button", { name: "Pause queue", exact: true }),
      "button-icon-pause.png",
    );
    await snapshot(
      page.getByRole("button", { name: "Stop queue", exact: true }),
      "button-icon-stop.png",
    );

    const failedRow = page.getByTestId("queue-row-item-failed-1");
    await snapshot(failedRow.locator('button[title="Retry"]'), "button-icon-retry.png");
    await snapshot(failedRow.locator('button[title="Remove"]'), "button-icon-remove.png");
  });
});
