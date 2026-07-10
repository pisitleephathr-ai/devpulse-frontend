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
  reports: ALL_ROLES,
  tasks: ALL_ROLES,
  leaves: ALL_ROLES,
  calendar: ALL_ROLES,
  projects: ["ADMIN", "MANAGER"],
  activity: ["ADMIN", "MANAGER"],
  users: ["ADMIN", "MANAGER"],
  roles: ["ADMIN"],
  settings: ["ADMIN", "MANAGER"],
};

export function roleCode(user: AuthUser | null): string {
  return user ? roleCodeOf(user.role) : "";
}

export function isAdmin(user: AuthUser | null): boolean {
  return roleCode(user) === "ADMIN";
}
export function isManagerOrAdmin(user: AuthUser | null): boolean {
  const c = roleCode(user);
  return c === "ADMIN" || c === "MANAGER";
}

export function canAccessMenu(user: AuthUser | null, menuKey: string): boolean {
  const allowed = MENU_ACCESS[menuKey];
  if (!allowed) return true; // unknown menu → allow
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
