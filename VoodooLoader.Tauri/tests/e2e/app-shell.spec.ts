import { expect, test } from "@playwright/test";

test("renders Voodoo Loader shell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('input[placeholder="Paste direct URL here"]', {
    state: "visible",
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /add to queue/i })).toBeVisible({
    timeout: 15_000,
  });
});
