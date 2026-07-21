import { type Page, expect } from "@playwright/test";

/**
 * Test credentials — set via env. Use a MANAGER or ADMIN account so the board
 * status transitions aren't blocked by the dev/tester role rules (a manager can
 * move a card to any status).
 */
export const CREDS = {
  email: process.env.E2E_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
};

export function requireCreds() {
  if (!CREDS.email || !CREDS.password) {
    throw new Error(
      "Missing credentials. Run with E2E_EMAIL and E2E_PASSWORD set to a manager/admin account."
    );
  }
}

/** A collision-free label so parallel/rerun test data never clashes. */
export function uniqueLabel(prefix: string): string {
  const stamp = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, "");
  return `${prefix} e2e-${stamp}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Log in through the real UI and land on the dashboard. Selectors are kept
 * resilient (input types + role/text) so they survive minor markup changes.
 */
export async function login(page: Page) {
  requireCreds();
  await page.goto("/login");

  // Email + password — target by input type first, fall back to name/placeholder.
  const email = page
    .locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]')
    .first();
  const password = page
    .locator('input[type="password"], input[name="password"]')
    .first();
  await email.fill(CREDS.email);
  await password.fill(CREDS.password);

  await page
    .getByRole("button", { name: /เข้าสู่ระบบ|เข้าใช้งาน|ล็อกอิน|เข้าระบบ|login|sign in/i })
    .first()
    .click();

  // Successful login redirects into the app.
  await page.waitForURL(/\/(dashboard|my-day)/, { timeout: 25_000 });
}

/** Open a left-sidebar / nav link by its Thai label, then wait for the URL. */
export async function goTo(page: Page, label: RegExp, urlPart: RegExp) {
  const link = page.getByRole("link", { name: label }).first();
  if (await link.count()) {
    await link.click();
  } else {
    // Fallback: navigate directly if the nav item isn't visible (mobile drawer).
    await page.goto(`/${urlPart.source.replace(/[\\/^$]/g, "")}`);
  }
  await page.waitForURL(urlPart, { timeout: 20_000 });
}

/**
 * Locate a form control by its Field label. The app's <Field> renders
 * `<div><label>{label}</label>{control}</div>` (label is a sibling, not a
 * wrapper), so getByLabel doesn't work — we find the wrapper div that holds the
 * label and dig into it. `sel` picks the control type (input/select/textarea).
 */
export function field(
  page: Page,
  label: string,
  sel: "input" | "select" | "textarea" = "input"
) {
  return page
    .locator("div", { has: page.locator("label", { hasText: label }) })
    .last()
    .locator(sel)
    .first();
}

/** Pick the first real <option> (skips a leading placeholder) of a <select>. */
export async function selectFirstReal(page: Page, select: ReturnType<Page["locator"]>) {
  const values = await select.locator("option").evaluateAll((opts) =>
    (opts as HTMLOptionElement[]).map((o) => ({ value: o.value, text: o.textContent ?? "" }))
  );
  const real = values.find((v) => v.value && !/—|เลือก|ไม่มี/.test(v.text));
  if (!real) throw new Error("No selectable option found");
  await select.selectOption(real.value);
  return real;
}

export { expect };
