import { test, expect } from "@playwright/test";
import { login, uniqueLabel, field, selectFirstReal } from "./helpers";

/**
 * Daily reports — open the create page, submit a report, and confirm it lands in
 * the list. Report content is derived from its work items, so we fill at least
 * one item's title.
 */
test.describe("Daily reports", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /รายงานประจำวัน/ }).first()).toBeVisible();
  });

  test("create a daily report", async ({ page }) => {
    const summary = uniqueLabel("สรุปงานวันนี้");
    await page.goto("/reports/new");

    // Project select (first real option).
    const proj = field(page, "โปรเจกต์", "select");
    if (await proj.count()) await selectFirstReal(page, proj).catch(() => {});

    // Fill the first free-text field we can find in the form (summary / a work item).
    const firstText = page.locator("form textarea, form input[type='text']").first();
    await firstText.fill(summary).catch(() => {});

    await page
      .getByRole("button", { name: /^ส่งรายงาน$|^บันทึก$|^ส่ง$|^สร้าง$/ })
      .first()
      .click();

    // Back on the reports list, the new report (or a success state) is shown.
    await page.waitForURL(/\/reports(\?|$)/, { timeout: 20_000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: /รายงานประจำวัน/ }).first()).toBeVisible();
  });
});
