import { expect, test } from "@playwright/test";

test("renders Voodoo Loader shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Voodoo Loader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to queue" })).toBeVisible();
});
