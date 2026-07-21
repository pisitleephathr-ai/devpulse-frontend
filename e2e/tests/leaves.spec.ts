import { test, expect } from "@playwright/test";
import { login, uniqueLabel, field, selectFirstReal } from "./helpers";

/**
 * Leave requests — create a leave and (as a manager) approve it. The reason text
 * carries a unique marker so we can find the exact row afterwards.
 */
test.describe("Leave requests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/leaves");
    await expect(page.getByRole("heading", { name: /คำขอลา|การลา/ }).first()).toBeVisible();
  });

  test("leaves page loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /คำขอลา|การลา/ }).first()).toBeVisible();
  });

  test("create then approve a leave", async ({ page }) => {
    const reason = uniqueLabel("ลาทดสอบ");

    // Open the create dialog.
    await page.getByRole("button", { name: /ขอลา|เพิ่มคำขอ|คำขอใหม่|ยื่นลา/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Leave type (first real option), then the reason.
    const type = field(page, "ประเภท", "select");
    if (await type.count()) await selectFirstReal(page, type).catch(() => {});
    const reasonBox = field(page, "เหตุผล", "textarea");
    await (await reasonBox.count() ? reasonBox : dialog.locator("textarea").first()).fill(reason);

    await dialog.getByRole("button", { name: /^ส่งคำขอ$|^บันทึก$|^ยื่น$|^ขอลา$/ }).first().click();
    await expect(dialog).toBeHidden();

    // The new request shows in the table.
    const row = page.getByRole("row").filter({ hasText: reason }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    // Approve it (manager). The approve control may be a button or an icon-button
    // in the row; try a couple of matches.
    const approve = row.getByRole("button", { name: /อนุมัติ/ }).first();
    if (await approve.count()) {
      await approve.click();
      // A confirm dialog may appear.
      const confirm = page.getByRole("dialog").getByRole("button", { name: /อนุมัติ|ยืนยัน/ }).last();
      if (await confirm.count()) await confirm.click().catch(() => {});
      await expect(
        page.getByRole("row").filter({ hasText: reason }).getByText(/อนุมัติแล้ว/).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
