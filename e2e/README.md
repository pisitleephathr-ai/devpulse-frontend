# DevPulse — End-to-end tests

Playwright tests that drive the **real running app** through the browser: login,
the board workflow (create → move dev→delivery → delete), daily reports, and
leave requests.

This is a **self-contained project** (its own `package.json`) so it does not
touch the main app's build or CI.

## Run it

```bash
cd e2e
npm install
npx playwright install chromium

# point at any running instance + a MANAGER/ADMIN account
export E2E_BASE_URL="https://pms.trrappstore.com"   # or http://localhost:3000
export E2E_EMAIL="manager@yourteam.com"
export E2E_PASSWORD="••••••••"

npm test            # headless
npm run test:headed # watch it click through
npm run report      # open the HTML report
```

Use a **manager/admin** account: the board's status moves are role-gated
(dev-side vs tester), and a manager can move a card to any status, which keeps
the workflow test simple and reliable.

## What it covers

| Spec | Flow |
| --- | --- |
| `auth.spec.ts` | login succeeds / a bad password is rejected |
| `board.spec.ts` | the 6 columns render; create a task (with handoff tester + estimate) → move In Progress → Dev Review → Dev Done → Delivery Done → timeline stamps show → delete (cleanup) |
| `reports.spec.ts` | reports page loads; create a daily report |
| `leaves.spec.ts` | leaves page loads; create a leave → approve it |

Tests run **serially** (one worker) because they share one login, and each
creates uniquely-labelled data (`e2e-<timestamp>-<rand>`) so reruns never clash.

## ⚠️ Notes

- **Running against production creates real data.** The board test deletes its
  own task, but the report/leave tests leave a record behind — prefer a staging
  instance, or clean up the `e2e-…` rows afterwards.
- **Selectors** target the current Thai UI via roles, input types, and field
  labels. The app's `<Field>` doesn't tie its `<label>` to the control, so the
  helper locates controls through the wrapping element (see `tests/helpers.ts`).
  If the markup shifts, add `data-testid` attributes to the key controls and
  switch the specs to `getByTestId` for durable tests — the fastest way to make
  this suite rock-solid.
