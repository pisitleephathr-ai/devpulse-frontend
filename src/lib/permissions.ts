/**
 * Centralized RBAC permission helpers. The single source of truth for what
 * each role can see and do on the frontend. The backend enforces the same
 * rules independently — this only drives visibility/UX.
 */
import type { AuthUser } from "./auth";
import { roleCodeOf } from "./mappers";

export const ALL_ROLES = ["ADMIN", "MANAGER", "DEVELOPER", "QA", "DESIGNER"];

/** Menu key → allowed role codes. Omitted/`*` means everyone. */
const MENU_ACCESS: Record<string, string[]> = {
  dashboard: ALL_ROLES,
  standup: ALL_ROLES,
  reports: ALL_ROLES,
  tasks: ALL_ROLES,
  leaves: ALL_ROLES,
  calendar: ALL_ROLES,
  analytics: ["ADMIN", "MANAGER"],
  projects: ["ADMIN", "MANAGER"],
  activity: ["ADMIN", "MANAGER"],
  users: ["ADMIN", "MANAGER"],
  roles: ["ADMIN"],
  settings: ["ADMIN", "MANAGER"],
};

/**
 * Menus admins can never lose from their sidebar, so a misconfigured menu list
 * can't lock the team out of role/settings management.
 */
export const ADMIN_LOCKED_MENUS = ["roles", "settings"];

export function roleCode(user: AuthUser | null): string {
  return user ? roleCodeOf(user.role) : "";
}

/** Built-in default menu keys visible to a role code (the pre-dynamic behavior). */
export function defaultMenusForRole(code: string): string[] {
  return Object.keys(MENU_ACCESS).filter((k) => {
    const allowed = MENU_ACCESS[k];
    if (!allowed) return true; // unrestricted
    if (allowed.length >= ALL_ROLES.length) return true; // common to everyone
    return allowed.includes(code);
  });
}

/** Full-admin: the ADMIN role code or an ADMIN_FULL capability grant. */
export function isAdmin(user: AuthUser | null): boolean {
  return hasPermission(user, "ADMIN_FULL");
}
/** Manager tier: MANAGER/ADMIN codes, or a role granted TEAM_MANAGE/ADMIN_FULL.
 *  Drives every manager action (approve leave, manage settings/projects, edit
 *  any task/report, delete tasks) — so granting "จัดการทีม" unlocks them all. */
export function isManagerOrAdmin(user: AuthUser | null): boolean {
  return hasPermission(user, "TEAM_MANAGE");
}

/** Personal pages every signed-in user can always reach, regardless of the
 *  team-menu access configured for their role (they aren't team menus). */
const PERSONAL_MENUS = ["profile"];

export function canAccessMenu(user: AuthUser | null, menuKey: string): boolean {
  // Personal pages (e.g. /profile) are never gated by role menu config.
  if (PERSONAL_MENUS.includes(menuKey)) return true;

  // Admins always keep the role/settings menus (prevents self-lockout).
  if (isAdmin(user) && ADMIN_LOCKED_MENUS.includes(menuKey)) return true;

  // Per-role dynamic config (set from the roles page) wins when present.
  // An empty/absent list means "inherit the built-in defaults" below.
  const role = user && typeof user.role === "object" ? user.role : null;
  const configured = role?.menuAccess;
  if (configured && configured.length > 0) return configured.includes(menuKey);

  const allowed = MENU_ACCESS[menuKey];
  if (!allowed) return true; // unknown menu → allow
  // Menus common to everyone stay visible to ANY role — including custom role
  // codes that aren't in the built-in ALL_ROLES list.
  if (isCommonMenu(menuKey)) return true;
  return allowed.includes(roleCode(user));
}

/** Menu visible to every role — shown while the current user is still loading. */
export function isCommonMenu(menuKey: string): boolean {
  const allowed = MENU_ACCESS[menuKey];
  return !allowed || allowed.length >= ALL_ROLES.length;
}

/** Map a pathname to its menu key for route guarding. */
export function routeMenuKey(pathname: string): string {
  if (pathname.startsWith("/settings/roles")) return "roles";
  if (pathname.startsWith("/settings")) return "settings";
  const seg = pathname.split("/")[1] || "dashboard";
  return seg;
}

export function canAccessRoute(user: AuthUser | null, pathname: string): boolean {
  return canAccessMenu(user, routeMenuKey(pathname));
}

/* ------------------------------ actions -------------------------------- */

export const canManageUsers = isAdmin;
export const canManageRoles = isAdmin;
export const canApproveLeave = isManagerOrAdmin;
export const canManageSettings = isManagerOrAdmin;
/** create / delete tasks (edit-any is also manager/admin). */
export const canManageTasks = isManagerOrAdmin;

/* --------------------------- fine-grained caps ------------------------- */

/** Fine-grained capabilities the manager tier (TEAM_MANAGE) implies. Mirrors
 *  the backend `expandPermissions` so the UI matches server enforcement. */
const TEAM_MANAGE_IMPLIES = [
  "PROJECT_MANAGE", "LEAVE_APPROVE", "ACTIVITY_VIEW", "SETTINGS_MANAGE",
  "TASK_CREATE", "TASK_DELETE", "TASK_EDIT_ANY", "REPORT_EDIT_ANY",
  "TASK_ATTACHMENT_UPLOAD", "TASK_ATTACHMENT_DELETE",
];

/** Every capability — ADMIN_FULL implies all of these (incl. TEAM_MANAGE). */
const ALL_PERMISSIONS = [
  "ADMIN_FULL", "TEAM_MANAGE", "USER_MANAGE", "ROLE_MANAGE",
  ...TEAM_MANAGE_IMPLIES,
];

/** The user's effective capability set (grants + role-code + tier implications). */
function effectivePermissions(user: AuthUser | null): Set<string> {
  const role = user && typeof user.role === "object" ? user.role : null;
  const set = new Set<string>(role?.permissions ?? []);
  const code = roleCode(user);
  if (code === "ADMIN") set.add("ADMIN_FULL");
  if (code === "MANAGER") set.add("TEAM_MANAGE");
  if (set.has("ADMIN_FULL")) for (const p of ALL_PERMISSIONS) set.add(p);
  if (set.has("TEAM_MANAGE")) for (const p of TEAM_MANAGE_IMPLIES) set.add(p);
  return set;
}

/** Whether the user holds a specific capability. */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  return effectivePermissions(user).has(permission);
}

/** May create tasks on the board (manager/admin, or a role granted TASK_CREATE). */
export function canCreateTask(user: AuthUser | null): boolean {
  return hasPermission(user, "TASK_CREATE");
}
/** create / edit / archive projects. */
export const canManageProjects = isManagerOrAdmin;
export const canArchiveProject = isManagerOrAdmin;
/** hard-delete a project (admin only). */
export const canDeleteProject = isAdmin;
/** view the activity/audit log. */
export const canViewActivity = isManagerOrAdmin;
/** any authenticated user may comment on tasks they can access. */
export function canCommentTask(user: AuthUser | null): boolean {
  return !!user;
}

/** A user may edit a task if manager/admin, or it is assigned to them. */
export function canEditTask(
  user: AuthUser | null,
  assigneeId: string | null | undefined
): boolean {
  if (isManagerOrAdmin(user)) return true;
  return !!user && assigneeId === user.id;
}

/** A user may edit/delete a report if manager/admin, or it is their own. */
export function canEditReport(
  user: AuthUser | null,
  authorId: string | null | undefined
): boolean {
  if (isManagerOrAdmin(user)) return true;
  return !!user && authorId === user.id;
}
