import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Auth", () => {
  test("logs in and lands on the app", async ({ page }) => {
    await login(page);
    // The app shell renders the sidebar with the dashboard link.
    await expect(
      page.getByRole("link", { name: /แดชบอร์ด|งานของฉัน/ }).first()
    ).toBeVisible();
  });

  test("rejects a bad password", async ({ page }) => {
    await page.goto("/login");
    await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .fill("nobody@example.com");
    await page
      .locator('input[type="password"], input[name="password"]')
      .first()
      .fill("definitely-wrong-password");
    await page
      .getByRole("button", { name: /เข้าสู่ระบบ|login|sign in/i })
      .first()
      .click();
    // Stays on /login (no redirect into the app).
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });
});
