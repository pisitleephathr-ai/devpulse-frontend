import { test, expect } from "@playwright/test";
import { login, uniqueLabel, field, selectFirstReal } from "./helpers";

/**
 * Board workflow — the headline feature. Creates a task with a handoff tester +
 * an estimate, walks it forward through the pipeline via the detail-modal status
 * select (a manager can pick any status, so this avoids flaky drag-and-drop),
 * checks the timeline stamps appear, then deletes it to clean up.
 *
 * NOTE: run as a MANAGER/ADMIN so the status moves aren't role-gated.
 */
test.describe("Task board workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/tasks");
    await expect(page.getByText("To Do", { exact: true }).first()).toBeVisible();
  });

  test("board shows the dev→delivery columns", async ({ page }) => {
    for (const col of ["To Do", "In Progress", "Dev Review", "Dev Done", "Delivery Done", "Delivery Fail"]) {
      await expect(page.getByText(col, { exact: true }).first()).toBeVisible();
    }
  });

  test("create a task, move it to Delivery Done, then delete it", async ({ page }) => {
    const title = uniqueLabel("งานทดสอบระบบ");

    // Open the create dialog (the board's create action).
    await page.getByRole("button", { name: /สร้างงาน|เพิ่มงาน|งานใหม่/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill the form.
    await field(page, "ชื่องาน").fill(title);
    await selectFirstReal(page, field(page, "โปรเจกต์", "select"));
    // Pick the first assignee chip.
    await dialog
      .getByRole("button")
      .filter({ hasNot: page.getByText(/ยกเลิก|บันทึก|สร้าง|เพิ่ม|ปิด/) })
      .first()
      .click()
      .catch(() => {});
    // Optional handoff tester — pick the first real teammate if present.
    const handoff = field(page, "ผู้รับต่อ", "select");
    if (await handoff.count()) await selectFirstReal(page, handoff).catch(() => {});
    // Estimated finish (date + time) — tomorrow 10:00.
    const est = field(page, "คาดการณ์เสร็จ");
    if (await est.count()) {
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      const v = `${d.toISOString().slice(0, 10)}T10:00`;
      await est.fill(v).catch(() => {});
    }

    await dialog.getByRole("button", { name: /^สร้างงาน$|^บันทึก$|^เพิ่มงาน$/ }).first().click();
    await expect(dialog).toBeHidden();

    // The card appears on the board.
    const card = page.getByText(title, { exact: false }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Open its detail modal and walk the status forward (manager override).
    await card.click();
    const detail = page.getByRole("dialog");
    await expect(detail).toBeVisible();
    const statusSelect = field(page, "สถานะ", "select");
    for (const s of ["In Progress", "Dev Review", "Dev Done", "Delivery Done"]) {
      await statusSelect.selectOption({ label: s });
      await page.waitForTimeout(600); // let the optimistic update + refetch settle
    }

    // Timeline stamps should show once delivered.
    await expect(detail.getByText(/ไทม์ไลน์|เริ่มจริง|ส่งมอบ/).first()).toBeVisible();

    // Cleanup — delete the task.
    await detail.getByRole("button", { name: /ลบ/ }).first().click();
    const confirm = page.getByRole("dialog").getByRole("button", { name: /ลบงาน|ยืนยัน|ลบ/ }).last();
    await confirm.click();
    await expect(page.getByText(title, { exact: false })).toHaveCount(0, { timeout: 15_000 });
  });
});
