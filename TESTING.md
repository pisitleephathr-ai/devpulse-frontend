# Testing

## Automated

### Backend API smoke tests
Dependency-free (Node 18+ built-in test runner + `fetch`). Runs against a deployed or local API.

```bash
cd devpulse-backend
npm test                                   # defaults to the live API
API_BASE=http://localhost:4000 npm test    # against a local server
```

Covers: `/api/health` up · protected route returns 401 without a token · login fails on bad creds (401) · login succeeds and the token unlocks `/api/tasks`.

### Type & build checks
```bash
# backend
npm run typecheck && npm run build
# frontend
npm run lint && npm run build
```

## Manual QA checklist

For every page: click every button, open every dropdown, use every filter, submit every form, open every modal; check loading, empty, and error states; check dark mode and 360 / 768 / 1440 px widths; confirm no console errors and no horizontal overflow on mobile.

- **Dashboard** — greeting matches current Bangkok time; KPIs/workload/blockers/report-status use real data; empty/loading states.
- **Reports** — defaults to today; วันนี้/ทั้งหมด; search (Thai+EN); author/project/status/date filters; cards readable; view/edit/delete by permission.
- **Tasks** — board loads; titles wrap; search + filters; drag-drop status; **multi-assignee** create/edit + avatar stack; comments; RBAC on edit.
- **Calendar** — tasks/reports/leaves render on correct dates (no UTC shift); type filters; month nav; empty state only when truly empty.
- **Users** — list; add/edit; role select; requiresDailyReport toggle; non-admins read-only.
- **Roles / Projects / Profile / Settings / Activity** — CRUD/actions per permission; forms validate; skeletons on load.
- **Global search** — Cmd/Ctrl+K opens; Thai + English; grouped results; navigates; empty state.

## Role-based test matrix

| Action | ADMIN | MANAGER | DEVELOPER / QA / DESIGNER |
| --- | --- | --- | --- |
| Dashboard / reports / tasks / calendar | ✓ | ✓ | ✓ |
| Approve / reject leave | ✓ | ✓ (not own) | ✗ (403) |
| Users page / manage users | ✓ | view | ✗ (403 route) |
| Roles page | ✓ | ✗ | ✗ |
| Projects (create/archive) | ✓ | ✓ | ✗ (403 route) |
| Activity log | ✓ | ✓ | ✗ (403) |
| Edit any task | ✓ | ✓ | own assigned only |

## Security / RBAC checks

- Unauthenticated API call → **401**. Authenticated but unauthorized → **403**.
- Direct-URL access to a restricted page → 403 page (client) and 403/scoped data (API).
- A DEVELOPER cannot approve leave or POST projects/users via API (verify with curl + a DEVELOPER token).
- No user can approve their own leave (except ADMIN override).
- `password` / hashes never appear in any API response.

## Responsive

Test at 360, 390, 768, 1024, 1440 px: sidebar collapses to a drawer (hamburger); tables scroll / cards stack; filter bars wrap; modals fit; task board scrolls horizontally; calendar stays usable; dark mode readable.
