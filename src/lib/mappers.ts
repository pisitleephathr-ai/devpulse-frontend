/**
 * Translation layer between the backend API (English enums, ISO dates, ids)
 * and the frontend's existing view types (Thai/English display strings,
 * "d ม." dates, avatarKey). Keeps the UI untouched — components keep consuming
 * the same shapes from mock-data.ts.
 */
import type {
  Report,
  Task,
  Leave,
  User,
  Priority,
  TaskStatus,
} from "./mock-data";

/* ----------------------------- Enum types ------------------------------ */

export type RoleEnum = "MANAGER" | "ADMIN" | "DEVELOPER" | "QA";
export type ReportStatusEnum = "SUBMITTED" | "DRAFT" | "LATE";
export type TaskStatusEnum =
  | "TODO"
  | "IN_PROGRESS"
  | "DEV_REVIEW"
  | "DEV_DONE"
  | "DELIVERY_DONE"
  | "DELIVERY_FAIL";
export type PriorityEnum = "HIGH" | "MEDIUM" | "LOW";
export type LeaveTypeEnum = "VACATION" | "SICK" | "PERSONAL" | "PARENTAL";
export type LeaveStatusEnum = "PENDING" | "APPROVED" | "REJECTED";

/* --------------------------- API entity types -------------------------- */

/** Dynamic role object returned by the API. */
export type ApiRole = {
  id: string;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  /** capability grants, e.g. ["TEAM_MANAGE","ADMIN_FULL"] */
  permissions?: string[];
  /** whether this role appears on the task board (assignable + in workload) */
  assignable?: boolean;
  /** sidebar menu keys this role may see ([] / undefined = inherit defaults) */
  menuAccess?: string[];
  /** personal-LINE notification types allowed ([] / undefined = all allowed) */
  lineNotifications?: string[];
  _count?: { users: number };
};

export type ApiUserMini = {
  id: string;
  name: string;
  avatarKey: string;
  /** present on most endpoints (userMiniSelect embeds the role) */
  roleRef?: { code: string; name: string } | null;
};
export type ApiUser = ApiUserMini & {
  email: string;
  active: boolean;
  requiresDailyReport?: boolean;
  createdAt: string;
  updatedAt: string;
  /** role object (new API); string enum tolerated from the old API */
  role: ApiRole | string | null;
};
export type ApiProject = {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
  status?: string;
  isArchived?: boolean;
  archivedAt?: string | null;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    members: number;
  };
  _count?: { tasks: number; reports: number };
};
export type ApiReport = {
  id: string;
  date: string;
  summary: string;
  did: string;
  blockers: string;
  plan: string;
  status: ReportStatusEnum;
  author: ApiUserMini;
  project: ApiProject;
  /** optional tasks linked to this report (compact shape) */
  relatedTasks?: ApiRelatedTask[];
  /** per-task work items (work + progress% + note) — the new primary content */
  items?: ApiReportItem[];
};
/** One report line: work + progress% + note, optionally linked to a board task. */
export type ApiReportItem = {
  id: string;
  section: "DID" | "PLAN";
  title: string;
  progress: number;
  note: string;
  taskId: string | null;
  task?: {
    id: string;
    title: string;
    status: TaskStatusEnum;
    project: { id: string; code: string; color: string; name: string };
  } | null;
};
/** Compact task shape embedded in a report's related-task list. */
export type ApiRelatedTask = {
  id: string;
  title: string;
  status: TaskStatusEnum;
  priority: PriorityEnum;
  project: { id: string; code: string; color: string; name: string };
};
export type ApiTaskLink = { id: string; title: string; url: string };
export type ApiTaskAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  /** Cloudinary upload fields (absent/null for legacy URL attachments). */
  source?: "URL" | "CLOUDINARY";
  kind?: "IMAGE" | "DOCUMENT" | "LINK";
  originalName?: string | null;
  displayName?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  secureUrl?: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  cloudinaryResourceType?: string | null;
  uploadedById?: string | null;
  createdAt?: string;
};
export type ApiTask = {
  id: string;
  title: string;
  description?: string;
  priority: PriorityEnum;
  status: TaskStatusEnum;
  dueDate: string | null;
  /** planning estimate, date + time (ISO) */
  estimatedFinishAt?: string | null;
  /** actual start (first IN_PROGRESS) / dev finished (DEV_DONE) / delivered */
  startedAt?: string | null;
  devDoneAt?: string | null;
  completedAt?: string | null;
  project: ApiProject;
  assignee: ApiUserMini | null;
  /** the tester the card is handed to after DEV_DONE */
  handoffUser?: ApiUserMini | null;
  /** full assignee set (multi-assignee); falls back to [assignee] */
  assignees?: ApiUserMini[];
  _count?: { links: number; attachments: number };
  /** checklist progress (present on board-list rows) */
  checklistTotal?: number;
  checklistDone?: number;
};
export type ApiChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  order: number;
};
export type ApiTaskDetail = ApiTask & {
  links: ApiTaskLink[];
  attachments: ApiTaskAttachment[];
  /** full checklist items (present on the detail endpoint) */
  checklist?: ApiChecklistItem[];
  /** the card this was reworked from + any reworks spawned from it */
  originTask?: { id: string; title: string; status: TaskStatusEnum } | null;
  reworkTasks?: { id: string; title: string; status: TaskStatusEnum }[];
};
/** Admin-configured leave-type policy (source of the leave form's type list). */
export type ApiLeaveType = {
  id: string;
  name: string;
  daysLabel: string;
  color: string;
  autoApprove: boolean;
  isActive: boolean;
  sortOrder: number;
};
export type ApiLeave = {
  id: string;
  /** freeform leave-type name (or a legacy enum code) */
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  halfDayPeriod?: "MORNING" | "AFTERNOON" | null;
  reason: string;
  status: LeaveStatusEnum;
  user: ApiUserMini;
  reviewedBy: ApiUserMini | null;
};
export type ApiActivity = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
  user: ApiUserMini;
};

/* --------------------------- Enum ↔ label maps ------------------------- */

export const ROLE_TO_TH: Record<string, string> = {
  MANAGER: "หัวหน้าทีม",
  ADMIN: "ผู้ดูแลระบบ",
  DEVELOPER: "นักพัฒนา",
  QA: "QA",
  DESIGNER: "Designer",
};

/** Extract the role CODE from a user's role field (object or legacy string). */
export function roleCodeOf(role: ApiRole | string | null | undefined): string {
  if (!role) return "DEVELOPER";
  return typeof role === "string" ? role : role.code;
}

/** Extract a human role NAME from a user's role field (object or legacy string). */
export function roleNameOf(role: ApiRole | string | null | undefined): string {
  if (!role) return ROLE_TO_TH.DEVELOPER;
  if (typeof role === "string") return ROLE_TO_TH[role] ?? role;
  return role.name || ROLE_TO_TH[role.code] || role.code;
}
export const REPORT_STATUS_TO_TH: Record<ReportStatusEnum, string> = {
  SUBMITTED: "ส่งแล้ว",
  DRAFT: "ฉบับร่าง",
  LATE: "ส่งช้า",
};
export const TASK_STATUS_TO_LABEL: Record<TaskStatusEnum, TaskStatus> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DEV_REVIEW: "Dev Review",
  DEV_DONE: "Dev Done",
  DELIVERY_DONE: "Delivery Done",
  DELIVERY_FAIL: "Delivery Fail",
};
export const PRIORITY_TO_LABEL: Record<PriorityEnum, Priority> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
// Legacy enum-code → Thai. New leave types already store their (freeform) name,
// so `mapLeave` falls back to the value itself for anything not listed here.
export const LEAVE_TYPE_TO_TH: Record<string, string> = {
  VACATION: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  PARENTAL: "ลาเลี้ยงดูบุตร",
};
export const LEAVE_STATUS_TO_TH: Record<LeaveStatusEnum, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

function invert<T extends string>(map: Record<T, string>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [v, k])
  ) as Record<string, T>;
}
export const TH_TO_ROLE = invert(ROLE_TO_TH);
export const TH_TO_REPORT_STATUS = invert(REPORT_STATUS_TO_TH);
export const LABEL_TO_TASK_STATUS = invert(TASK_STATUS_TO_LABEL);
export const LABEL_TO_PRIORITY = invert(PRIORITY_TO_LABEL);
export const TH_TO_LEAVE_TYPE = invert(LEAVE_TYPE_TO_TH);
export const TH_TO_LEAVE_STATUS = invert(LEAVE_STATUS_TO_TH);

/* Option lists (value = enum sent to API, label = display string). */
export const REPORT_STATUS_ENUM_OPTIONS = enumOptions(REPORT_STATUS_TO_TH);
export const TASK_STATUS_ENUM_OPTIONS = enumOptions(TASK_STATUS_TO_LABEL);
export const PRIORITY_ENUM_OPTIONS = enumOptions(PRIORITY_TO_LABEL);
export const LEAVE_TYPE_ENUM_OPTIONS = enumOptions(LEAVE_TYPE_TO_TH);
export const ROLE_ENUM_OPTIONS = enumOptions(ROLE_TO_TH);

function enumOptions<T extends string>(map: Record<T, string>) {
  return (Object.entries(map) as [T, string][]).map(([value, label]) => ({
    value,
    label,
  }));
}

/* ------------------------------ Date helpers --------------------------- */

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Render the day in Asia/Bangkok (UTC+7), NOT the viewer's local timezone, so a
// report/leave/task day is stable regardless of where it's viewed or the stored
// time component (e.g. a date stored at 00:00Z stays on the same Bangkok day).
function bangkokParts(iso: string | Date): Date {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
}

export function formatThaiDate(iso: string | Date): string {
  const d = bangkokParts(iso);
  return `${d.getUTCDate()} ${MONTHS_TH[d.getUTCMonth()]}`;
}

export function formatThaiRange(startIso: string, endIso: string): string {
  const s = bangkokParts(startIso);
  const e = bangkokParts(endIso);
  if (s.getTime() === e.getTime()) return formatThaiDate(startIso);
  if (s.getUTCMonth() === e.getUTCMonth())
    return `${s.getUTCDate()}–${e.getUTCDate()} ${MONTHS_TH[s.getUTCMonth()]}`;
  return `${formatThaiDate(startIso)} – ${formatThaiDate(endIso)}`;
}

/* ----------------------------- API → view ------------------------------ */

export function mapUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    key: u.avatarKey,
    email: u.email,
    role: roleNameOf(u.role),
    roleCode: roleCodeOf(u.role),
    active: u.active,
    requiresDailyReport: u.requiresDailyReport ?? true,
  };
}

export function mapReport(r: ApiReport): Report {
  return {
    id: r.id,
    date: formatThaiDate(r.date),
    name: r.author.name,
    key: r.author.avatarKey,
    proj: r.project.name,
    summary: r.summary,
    status: REPORT_STATUS_TO_TH[r.status] ?? r.status,
    did: r.did,
    blockers: r.blockers,
    plan: r.plan,
    relatedTasks: (r.relatedTasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: TASK_STATUS_TO_LABEL[t.status],
      pri: PRIORITY_TO_LABEL[t.priority],
      proj: t.project.code,
      projColor: t.project.color,
    })),
    items: (r.items ?? []).map((it) => ({
      id: it.id,
      section: it.section === "PLAN" ? "PLAN" : "DID",
      title: it.title,
      progress: it.progress,
      note: it.note,
      task: it.task
        ? {
            id: it.task.id,
            title: it.task.title,
            status: TASK_STATUS_TO_LABEL[it.task.status],
            proj: it.task.project.code,
            projColor: it.task.project.color,
          }
        : null,
    })),
  };
}

export function mapTask(t: ApiTask): Task {
  const list =
    t.assignees && t.assignees.length
      ? t.assignees
      : t.assignee
        ? [t.assignee]
        : [];
  const assignees = list.map((u) => ({ id: u.id, key: u.avatarKey, name: u.name }));
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    proj: t.project.code,
    projFg: t.project.color,
    key: assignees[0]?.key ?? "?",
    assignees,
    pri: PRIORITY_TO_LABEL[t.priority],
    due: t.dueDate ? formatThaiDate(t.dueDate) : "—",
    dueISO: t.dueDate ?? null,
    status: TASK_STATUS_TO_LABEL[t.status],
    handoff: t.handoffUser
      ? { id: t.handoffUser.id, key: t.handoffUser.avatarKey, name: t.handoffUser.name }
      : null,
    estimatedFinishISO: t.estimatedFinishAt ?? null,
    startedISO: t.startedAt ?? null,
    devDoneISO: t.devDoneAt ?? null,
    completedISO: t.completedAt ?? null,
    linkCount: t._count?.links ?? 0,
    attachmentCount: t._count?.attachments ?? 0,
    checklistTotal: t.checklistTotal ?? 0,
    checklistDone: t.checklistDone ?? 0,
  };
}

export function mapLeave(l: ApiLeave): Leave {
  return {
    id: l.id,
    name: l.user.name,
    key: l.user.avatarKey,
    type: LEAVE_TYPE_TO_TH[l.type] ?? l.type,
    dates: formatThaiRange(l.startDate, l.endDate),
    days: l.days,
    halfDayPeriod: l.halfDayPeriod ?? null,
    reason: l.reason,
    status: LEAVE_STATUS_TO_TH[l.status] ?? l.status,
  };
}

export const HALF_DAY_TH: Record<string, string> = {
  MORNING: "ครึ่งวันเช้า",
  AFTERNOON: "ครึ่งวันบ่าย",
};

/** Human duration label, e.g. "1 วัน" or "0.5 วัน (ครึ่งวันเช้า)". */
export function leaveDurationLabel(days: number, half?: string | null): string {
  return half ? `${days} วัน (${HALF_DAY_TH[half] ?? "ครึ่งวัน"})` : `${days} วัน`;
}

/* ---------------------------- Input DTO types -------------------------- */

export type ReportItemInput = {
  section?: "DID" | "PLAN";
  taskId?: string | null;
  title: string;
  progress: number;
  note?: string;
};
export type ReportInput = {
  projectId: string;
  date?: string;
  summary?: string;
  /** legacy free-text; optional now — content comes from `items` */
  did?: string;
  blockers?: string;
  plan?: string;
  status?: ReportStatusEnum;
  /** optional board tasks linked to this report */
  relatedTaskIds?: string[];
  /** the per-task work items (new primary content) */
  items?: ReportItemInput[];
};
export type TaskLinkInput = { title: string; url: string };
export type TaskAttachmentInput = {
  fileName: string;
  fileUrl: string;
  fileType?: string;
};
export type TaskInput = {
  title: string;
  projectId: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  /** tester the card is handed to after Dev Done */
  handoffUserId?: string | null;
  priority?: PriorityEnum;
  status?: TaskStatusEnum;
  dueDate?: string | null;
  /** planning estimate, date + time (ISO) */
  estimatedFinishAt?: string | null;
  description?: string;
  links?: TaskLinkInput[];
  attachments?: TaskAttachmentInput[];
};
export type LeaveInput = {
  /** freeform leave-type name (a LeaveTypePolicy.name) */
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  halfDayPeriod?: "MORNING" | "AFTERNOON";
};
export type UserInput = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  requiresDailyReport?: boolean;
  sendWelcomeEmail?: boolean;
};
export type UserUpdateInput = Partial<{
  name: string;
  roleId: string;
  active: boolean;
  requiresDailyReport: boolean;
}>;

/* ------------------------------- Roles --------------------------------- */

export type RoleInput = {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  assignable?: boolean;
  menuAccess?: string[];
  lineNotifications?: string[];
};
export type RoleUpdateInput = Partial<{
  name: string;
  description: string;
  isActive: boolean;
  permissions: string[];
  assignable: boolean;
  menuAccess: string[];
  lineNotifications: string[];
}>;
