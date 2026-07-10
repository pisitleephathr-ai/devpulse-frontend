/**
 * DevPulse — single source of mock data.
 *
 * All pages read from this file. No backend, no persistence.
 * Text is Thai to match the handoff's realistic fake team data.
 * Color maps (avatars, badges, priorities, leave types) live here too so the
 * shared components stay presentational.
 */

/* ------------------------------------------------------------------ */
/* Color maps                                                          */
/* ------------------------------------------------------------------ */

/** [background, foreground, initials] keyed by a person's short key. */
export const AVATARS: Record<string, [string, string, string]> = {
  Maya: ["#e0e7ff", "#4338ca", "MC"],
  Jonas: ["#fce7f3", "#be185d", "JW"],
  Priya: ["#dcfce7", "#15803d", "PN"],
  Tom: ["#fef3c7", "#b45309", "TO"],
  Sara: ["#f3e8ff", "#7e22ce", "SL"],
  Alex: ["#ffe4e6", "#be123c", "AR"],
  Lena: ["#ccfbf1", "#0f766e", "LH"],
  Dana: ["#e4e4e7", "#3f3f46", "DK"],
  Ben: ["#dbeafe", "#1d4ed8", "BC"],
};

/** Deterministic fallback palette for people not in the seed AVATARS map. */
const FALLBACK_AVATARS: [string, string][] = [
  ["#e0e7ff", "#4338ca"],
  ["#dcfce7", "#15803d"],
  ["#fef3c7", "#b45309"],
  ["#f3e8ff", "#7e22ce"],
  ["#dbeafe", "#1d4ed8"],
  ["#ffe4e6", "#be123c"],
];

export function avatar(key: string): [string, string, string] {
  if (AVATARS[key]) return AVATARS[key];
  const initials = key.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const [bg, fg] = FALLBACK_AVATARS[Math.abs(hash) % FALLBACK_AVATARS.length];
  return [bg, fg, initials];
}

/** [background, foreground] keyed by status label. */
export const STATUS_BADGES: Record<string, [string, string]> = {
  "ส่งแล้ว": ["#dcfce7", "#15803d"],
  "ฉบับร่าง": ["#f4f4f5", "#52525b"],
  "ส่งช้า": ["#fef3c7", "#b45309"],
  "ยังไม่ส่ง": ["#fee2e2", "#b91c1c"],
  "รออนุมัติ": ["#fef3c7", "#b45309"],
  "อนุมัติแล้ว": ["#dcfce7", "#15803d"],
  "ปฏิเสธ": ["#fee2e2", "#b91c1c"],
  "ใช้งานอยู่": ["#dcfce7", "#15803d"],
  "ปิดใช้งาน": ["#f4f4f5", "#71717a"],
};

export function statusColors(status: string): [string, string] {
  return STATUS_BADGES[status] ?? ["#f4f4f5", "#52525b"];
}

export const LEAVE_TYPE_COLORS: Record<string, [string, string]> = {
  "ลาพักร้อน": ["#ccfbf1", "#0f766e"],
  "ลาป่วย": ["#fef3c7", "#b45309"],
  "ลากิจ": ["#f3e8ff", "#7e22ce"],
  "ลาเลี้ยงดูบุตร": ["#dbeafe", "#1d4ed8"],
};

export const PRIORITY_COLORS: Record<string, [string, string]> = {
  High: ["#fee2e2", "#b91c1c"],
  Medium: ["#fef3c7", "#b45309"],
  Low: ["#f4f4f5", "#52525b"],
};

export const ROLE_COLORS: Record<string, [string, string]> = {
  "หัวหน้าทีม": ["#ccfbf1", "#0f766e"],
  "ผู้ดูแลระบบ": ["#e4e4e7", "#3f3f46"],
  "นักพัฒนา": ["#e0e7ff", "#4338ca"],
  QA: ["#f3e8ff", "#7e22ce"],
};

/* ------------------------------------------------------------------ */
/* Current user                                                        */
/* ------------------------------------------------------------------ */

export const CURRENT_USER = {
  name: "เลนา ฮอฟฟ์แมน",
  first: "เลนา",
  key: "Lena",
  role: "หัวหน้าทีม",
  email: "lena@devpulse.io",
  isManager: true,
};

/** Assignable / selectable team members (for report + task + leave forms). */
export const TEAM_MEMBERS: { key: string; name: string }[] = [
  { key: "Maya", name: "มายา เฉิน" },
  { key: "Jonas", name: "โจนาส เวเบอร์" },
  { key: "Priya", name: "ปรียา นาอีร์" },
  { key: "Tom", name: "ทอม โอคาฟอร์" },
  { key: "Sara", name: "ซาร่า ลินด์ควิสต์" },
  { key: "Alex", name: "อเล็กซ์ รุยซ์" },
  { key: "Lena", name: "เลนา ฮอฟฟ์แมน" },
];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** lucide-react icon name */
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "แดชบอร์ด", href: "/dashboard", icon: "LayoutDashboard" },
  { id: "reports", label: "รายงานประจำวัน", href: "/reports", icon: "FileText" },
  { id: "tasks", label: "บอร์ดงาน", href: "/tasks", icon: "KanbanSquare" },
  { id: "leaves", label: "คำขอลา", href: "/leaves", icon: "CalendarClock" },
  { id: "calendar", label: "ปฏิทินทีม", href: "/calendar", icon: "CalendarDays" },
  { id: "activity", label: "บันทึกกิจกรรม", href: "/activity", icon: "Activity" },
  { id: "users", label: "ผู้ใช้งาน", href: "/users", icon: "Users" },
  { id: "roles", label: "บทบาท", href: "/settings/roles", icon: "ShieldCheck" },
  { id: "settings", label: "ตั้งค่า", href: "/settings", icon: "SlidersHorizontal" },
];

/** Human page titles shown in the header, keyed by first path segment. */
export const PAGE_TITLES: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  reports: "รายงานประจำวัน",
  tasks: "บอร์ดงาน",
  leaves: "คำขอลา",
  calendar: "ปฏิทินทีม",
  activity: "บันทึกกิจกรรม",
  users: "ผู้ใช้งาน",
  roles: "บทบาท",
  settings: "ตั้งค่า",
  profile: "โปรไฟล์ของฉัน",
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type Stat = { label: string; value: string; sub: string; dot: string };

export const DASHBOARD_STATS: Stat[] = [
  { label: "รายงานวันนี้", value: "5/7", sub: "ซาร่ากำลังร่าง · เบนยังไม่ส่ง", dot: "#0d9488" },
  { label: "คำขอลารออนุมัติ", value: "3", sub: "รอนานสุด 2 วัน", dot: "#f59e0b" },
  { label: "งานกำลังทำ", value: "4", sub: "ครบกำหนด 2 งานในสัปดาห์นี้", dot: "#3b82f6" },
  { label: "อุปสรรค", value: "2", sub: "ฐานข้อมูล Staging · ใบรับรอง Push", dot: "#e11d48" },
];

export type ReportStatusRow = {
  name: string;
  key: string;
  proj: string;
  time: string;
  status: string;
};

export const REPORT_STATUS: ReportStatusRow[] = [
  { name: "มายา เฉิน", key: "Maya", proj: "Console Redesign", time: "08:42 น.", status: "ส่งแล้ว" },
  { name: "โจนาส เวเบอร์", key: "Jonas", proj: "Atlas API", time: "09:05 น.", status: "ส่งแล้ว" },
  { name: "ปรียา นาอีร์", key: "Priya", proj: "Atlas API", time: "09:12 น.", status: "ส่งแล้ว" },
  { name: "ทอม โอคาฟอร์", key: "Tom", proj: "Orbit Mobile", time: "09:31 น.", status: "ส่งแล้ว" },
  { name: "อเล็กซ์ รุยซ์", key: "Alex", proj: "Infra Hardening", time: "10:02 น.", status: "ส่งแล้ว" },
  { name: "ซาร่า ลินด์ควิสต์", key: "Sara", proj: "Console Redesign", time: "—", status: "ฉบับร่าง" },
  { name: "เบน คาร์เตอร์", key: "Ben", proj: "Atlas API", time: "—", status: "ยังไม่ส่ง" },
];

export type ProjectProgress = { name: string; done: number; total: number };

export const PROJECT_PROGRESS: ProjectProgress[] = [
  { name: "Atlas API", done: 13, total: 18 },
  { name: "Console Redesign", done: 22, total: 25 },
  { name: "Orbit Mobile", done: 9, total: 20 },
  { name: "Infra Hardening", done: 6, total: 19 },
];

export type ActivityItem = { who: string; what: string; time: string; dot: string };

export const TEAM_ACTIVITY: ActivityItem[] = [
  { who: "ปรียา นาอีร์", what: 'ย้าย "ตรวจสอบคำขอลา" ไปขั้นรอรีวิว', time: "24 นาทีที่แล้ว", dot: "#7c3aed" },
  { who: "อเล็กซ์ รุยซ์", what: 'ทำ "ปรับแต่ง CI cache" เสร็จแล้ว', time: "1 ชั่วโมงที่แล้ว", dot: "#10b981" },
  { who: "ทอม โอคาฟอร์", what: "รายงานอุปสรรคในโปรเจกต์ Orbit Mobile", time: "2 ชั่วโมงที่แล้ว", dot: "#e11d48" },
  { who: "โจนาส เวเบอร์", what: "ส่งรายงานประจำวันแล้ว", time: "3 ชั่วโมงที่แล้ว", dot: "#0d9488" },
  { who: "มายา เฉิน", what: "ขอลากิจวันที่ 31 ก.ค.", time: "4 ชั่วโมงที่แล้ว", dot: "#f59e0b" },
  { who: "ซาร่า ลินด์ควิสต์", what: 'คอมเมนต์ใน "แผน QA สำหรับรีลีส 2.4"', time: "เมื่อวาน", dot: "#a1a1aa" },
];

/* ------------------------------------------------------------------ */
/* Daily reports                                                       */
/* ------------------------------------------------------------------ */

export type ReportStatus = "ส่งแล้ว" | "ฉบับร่าง" | "ส่งช้า";

export type Report = {
  id: string;
  date: string;
  name: string;
  key: string;
  proj: string;
  summary: string;
  status: string;
  did: string;
  blockers: string;
  plan: string;
};

const REPORTS_SEED: Omit<Report, "id">[] = [
  {
    date: "9 ก.ค.",
    name: "มายา เฉิน",
    key: "Maya",
    proj: "Console Redesign",
    summary: "ทำกราฟแดชบอร์ด v2 เสร็จ รีวิว PR หน้า onboarding",
    status: "ส่งแล้ว",
    did: "ทำกราฟแดชบอร์ด v2 เสร็จและเปิดใช้หลัง feature flag แล้ว รีวิว PR เช็กลิสต์ onboarding ของปรียา และทำงานร่วมกับซาร่าเรื่องแผน QA สำหรับรีลีส 2.4",
    blockers: "วันนี้ไม่มี",
    plan: "เริ่มทำ empty state ของหน้ารายการรายงาน จากนั้นทำ responsive ให้แถบเมนูด้านข้าง",
  },
  {
    date: "9 ก.ค.",
    name: "โจนาส เวเบอร์",
    key: "Jonas",
    proj: "Atlas API",
    summary: "ทำ OAuth refresh flow; ติดเรื่องสิทธิ์เข้าฐานข้อมูล Staging",
    status: "ส่งแล้ว",
    did: "พัฒนาเส้นทาง token refresh ของ OAuth flow และเพิ่ม integration test สำหรับกรณี token หมดอายุ",
    blockers: "ติดเรื่องสิทธิ์เข้าถึงฐานข้อมูล Staging — สิทธิ์ถูกยกเลิกตอน rotation รอบล่าสุด เปิดตั๋วแจ้ง IT ตั้งแต่ 9 โมงเช้า",
    plan: "ทำ refresh flow ให้เสร็จเมื่อได้สิทธิ์คืน ระหว่างนี้เริ่มเขียน design doc เรื่อง rate limiting",
  },
  {
    date: "9 ก.ค.",
    name: "ปรียา นาอีร์",
    key: "Priya",
    proj: "Atlas API",
    summary: "ตรวจสอบคำขอลาอยู่ในขั้นรีวิว ส่งออก CSV เสร็จแล้ว",
    status: "ส่งแล้ว",
    did: "ปล่อยฟีเจอร์ส่งออกรายงานเป็น CSV แล้ว ย้ายงานตรวจสอบคำขอลาเข้าขั้นรีวิวและแก้คอมเมนต์รอบแรกแล้ว",
    blockers: "ไม่มี",
    plan: "แก้คอมเมนต์รีวิวที่เหลือ จากนั้นช่วยโจนาสเรื่อง rate limiting",
  },
  {
    date: "9 ก.ค.",
    name: "ทอม โอคาฟอร์",
    key: "Tom",
    proj: "Orbit Mobile",
    summary: "ทำ Push Notification ฝั่ง Android; รอใบรับรอง",
    status: "ส่งแล้ว",
    did: "ต่อระบบ FCM สำหรับ Push Notification ฝั่ง Android และทำหน้าตั้งค่าการแจ้งเตือนเสร็จแล้ว",
    blockers: "รอใบรับรอง Push จากดานา — ยังทดสอบบนเครื่องจริงไม่ได้จนกว่าจะได้รับ",
    plan: "ทดสอบ push แบบ end-to-end เมื่อได้ใบรับรอง แล้วเริ่มทำฝั่ง iOS ให้เท่ากัน",
  },
  {
    date: "9 ก.ค.",
    name: "อเล็กซ์ รุยซ์",
    key: "Alex",
    proj: "Infra Hardening",
    summary: "ปรับ CI cache เสร็จ เวลา build ลดลง 40%",
    status: "ส่งแล้ว",
    did: "ปรับแต่ง CI cache เสร็จ — เวลา build เฉลี่ยลดลง 40% และลบ Terraform module ที่ไม่ใช้แล้ว 2 ตัว",
    blockers: "ไม่มี",
    plan: "เก็บกวาด Terraform module ต่อ และช่วยดูตั๋วเรื่องสิทธิ์ Staging ของโจนาส",
  },
  {
    date: "9 ก.ค.",
    name: "ซาร่า ลินด์ควิสต์",
    key: "Sara",
    proj: "Console Redesign",
    summary: "ฉบับร่าง — กำลังเขียนแผน QA สำหรับ 2.4",
    status: "ฉบับร่าง",
    did: "กำลังร่างแผน QA สำหรับรีลีส 2.4 คัดกรอง regression suite ไปได้ประมาณครึ่งทาง",
    blockers: "—",
    plan: "—",
  },
  {
    date: "8 ก.ค.",
    name: "มายา เฉิน",
    key: "Maya",
    proj: "Console Redesign",
    summary: "ทำ tooltip ของกราฟ และตรวจ a11y ของเมนู",
    status: "ส่งแล้ว",
    did: "ทำ tooltip ของกราฟ และตรวจ accessibility ของเมนูด้านข้าง",
    blockers: "ไม่มี",
    plan: "ทำกราฟ v2 ให้เสร็จ",
  },
  {
    date: "8 ก.ค.",
    name: "โจนาส เวเบอร์",
    key: "Jonas",
    proj: "Atlas API",
    summary: "วางโครง OAuth flow และ migrate schema",
    status: "ส่งช้า",
    did: "วางโครงสร้างสำหรับ OAuth refresh flow และรัน migration ของ schema sessions บน Staging",
    blockers: "ไม่มี",
    plan: "ทำเส้นทาง token refresh",
  },
];

export const REPORTS: Report[] = REPORTS_SEED.map((r, i) => ({
  id: `r${i + 1}`,
  ...r,
}));

export const PROJECTS = ["Atlas API", "Orbit Mobile", "Console Redesign", "Infra Hardening"];

export const REPORT_STATUS_OPTIONS: ReportStatus[] = ["ส่งแล้ว", "ฉบับร่าง", "ส่งช้า"];

/* ------------------------------------------------------------------ */
/* Task board                                                          */
/* ------------------------------------------------------------------ */

export type TaskStatus = "Todo" | "In Progress" | "Review" | "Done";
export type Priority = "High" | "Medium" | "Low";

export type Task = {
  id: string;
  title: string;
  /** progress/notes text (used for search). */
  description: string;
  /** Project short code shown on the card, e.g. "ATLAS". */
  proj: string;
  projFg: string;
  key: string;
  pri: Priority;
  due: string;
  /** ISO due date for date-range filtering (null if none). */
  dueISO: string | null;
  status: TaskStatus;
  linkCount: number;
  attachmentCount: number;
};

export type KanbanColumn = { name: TaskStatus; dot: string; cards: Task[] };

/** Column order + dot colors for the board. */
export const TASK_STATUS_META: { name: TaskStatus; dot: string }[] = [
  { name: "Todo", dot: "#a1a1aa" },
  { name: "In Progress", dot: "#3b82f6" },
  { name: "Review", dot: "#8b5cf6" },
  { name: "Done", dot: "#10b981" },
];

export const TASK_STATUSES: TaskStatus[] = TASK_STATUS_META.map((m) => m.name);
export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

/** Selectable projects with their card code + accent color. */
export const TASK_PROJECTS = [
  { name: "Atlas API", code: "ATLAS", color: "#0f766e" },
  { name: "Orbit Mobile", code: "ORBIT", color: "#b45309" },
  { name: "Console Redesign", code: "CONSOLE", color: "#7c3aed" },
  { name: "Infra Hardening", code: "INFRA", color: "#be123c" },
];

const TASKS_SEED: Omit<
  Task,
  "id" | "description" | "dueISO" | "linkCount" | "attachmentCount"
>[] = [
  { title: "Rate limiting สำหรับ Public API", proj: "ATLAS", projFg: "#0f766e", key: "Jonas", pri: "High", due: "14 ก.ค.", status: "Todo" },
  { title: "Empty state หน้ารายการรายงาน", proj: "CONSOLE", projFg: "#7c3aed", key: "Maya", pri: "Low", due: "18 ก.ค.", status: "Todo" },
  { title: "แผน QA สำหรับรีลีส 2.4", proj: "CONSOLE", projFg: "#7c3aed", key: "Sara", pri: "Medium", due: "16 ก.ค.", status: "Todo" },
  { title: "OAuth token refresh flow", proj: "ATLAS", projFg: "#0f766e", key: "Jonas", pri: "High", due: "10 ก.ค.", status: "In Progress" },
  { title: "กราฟแดชบอร์ด v2", proj: "CONSOLE", projFg: "#7c3aed", key: "Maya", pri: "Medium", due: "15 ก.ค.", status: "In Progress" },
  { title: "Push Notification (Android)", proj: "ORBIT", projFg: "#b45309", key: "Tom", pri: "High", due: "11 ก.ค.", status: "In Progress" },
  { title: "เก็บกวาด Terraform module", proj: "INFRA", projFg: "#be123c", key: "Alex", pri: "Low", due: "21 ก.ค.", status: "In Progress" },
  { title: "ตรวจสอบคำขอลา (validation)", proj: "ATLAS", projFg: "#0f766e", key: "Priya", pri: "Medium", due: "9 ก.ค.", status: "Review" },
  { title: "UI เช็กลิสต์ onboarding", proj: "CONSOLE", projFg: "#7c3aed", key: "Maya", pri: "Low", due: "9 ก.ค.", status: "Review" },
  { title: "ปรับแต่ง CI cache", proj: "INFRA", projFg: "#be123c", key: "Alex", pri: "Medium", due: "8 ก.ค.", status: "Done" },
  { title: "ส่งออกรายงานเป็น CSV", proj: "ATLAS", projFg: "#0f766e", key: "Priya", pri: "Low", due: "7 ก.ค.", status: "Done" },
];

export const TASKS: Task[] = TASKS_SEED.map((t, i) => ({
  id: `t${i + 1}`,
  description: "",
  dueISO: null,
  linkCount: 0,
  attachmentCount: 0,
  ...t,
}));

/** Group a flat task list into ordered kanban columns. */
export function groupTasks(tasks: Task[]): KanbanColumn[] {
  return TASK_STATUS_META.map((m) => ({
    ...m,
    cards: tasks.filter((t) => t.status === m.name),
  }));
}

/* ------------------------------------------------------------------ */
/* Leave requests                                                      */
/* ------------------------------------------------------------------ */

export type LeaveStatus = "รออนุมัติ" | "อนุมัติแล้ว" | "ปฏิเสธ";

export type Leave = {
  id: string;
  name: string;
  key: string;
  type: string;
  dates: string;
  days: number;
  reason: string;
  status: string;
};

const LEAVES_SEED: Omit<Leave, "id">[] = [
  { name: "ทอม โอคาฟอร์", key: "Tom", type: "ลาพักร้อน", dates: "20–24 ก.ค.", days: 5, reason: "ไปเที่ยวกับครอบครัวที่ลิสบอน", status: "อนุมัติแล้ว" },
  { name: "ปรียา นาอีร์", key: "Priya", type: "ลากิจ", dates: "15 ก.ค.", days: 1, reason: "ย้ายที่อยู่", status: "รออนุมัติ" },
  { name: "โจนาส เวเบอร์", key: "Jonas", type: "ลาพักร้อน", dates: "3–14 ส.ค.", days: 10, reason: "พักร้อนช่วงฤดูร้อน", status: "รออนุมัติ" },
  { name: "มายา เฉิน", key: "Maya", type: "ลากิจ", dates: "31 ก.ค.", days: 1, reason: "นัดพบแพทย์", status: "รออนุมัติ" },
  { name: "ซาร่า ลินด์ควิสต์", key: "Sara", type: "ลาป่วย", dates: "8 ก.ค.", days: 1, reason: "ไข้หวัด", status: "อนุมัติแล้ว" },
  { name: "อเล็กซ์ รุยซ์", key: "Alex", type: "ลากิจ", dates: "30 มิ.ย.", days: 1, reason: "ติดต่อราชการ", status: "ปฏิเสธ" },
];

export const LEAVES: Leave[] = LEAVES_SEED.map((l, i) => ({
  id: `lv${i + 1}`,
  ...l,
}));

export const LEAVE_TYPES_FORM = ["ลาพักร้อน", "ลาป่วย", "ลากิจ", "ลาเลี้ยงดูบุตร"];
export const LEAVE_STATUS_OPTIONS: LeaveStatus[] = ["รออนุมัติ", "อนุมัติแล้ว", "ปฏิเสธ"];

export function pendingLeaveCount(leaves: Leave[] = LEAVES): number {
  return leaves.filter((l) => l.status === "รออนุมัติ").length;
}

/** Upcoming leave shown on the dashboard right column. */
export function upcomingLeave(leaves: Leave[] = LEAVES) {
  const approved = leaves.filter(
    (l) => l.status === "อนุมัติแล้ว" && !l.dates.includes("มิ.ย.")
  );
  const pending = leaves.filter((l) => l.status === "รออนุมัติ").slice(0, 2);
  return [...approved, ...pending].slice(0, 3).map((l) => ({
    ...l,
    displayDates: l.dates + (l.status === "รออนุมัติ" ? " · รออนุมัติ" : ""),
  }));
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export type User = {
  id: string;
  name: string;
  key: string;
  email: string;
  /** display name of the role (e.g. "ผู้ดูแลระบบ", "Designer") */
  role: string;
  /** role code for permission checks (e.g. "ADMIN") */
  roleCode: string;
  active: boolean;
  /** whether this user is expected to submit a daily report */
  requiresDailyReport: boolean;
};

const USERS_SEED: Omit<User, "id" | "roleCode" | "requiresDailyReport">[] = [
  { name: "เลนา ฮอฟฟ์แมน", key: "Lena", email: "lena@devpulse.io", role: "หัวหน้าทีม", active: true },
  { name: "ดานา คิม", key: "Dana", email: "dana@devpulse.io", role: "ผู้ดูแลระบบ", active: true },
  { name: "มายา เฉิน", key: "Maya", email: "maya@devpulse.io", role: "นักพัฒนา", active: true },
  { name: "โจนาส เวเบอร์", key: "Jonas", email: "jonas@devpulse.io", role: "นักพัฒนา", active: true },
  { name: "ปรียา นาอีร์", key: "Priya", email: "priya@devpulse.io", role: "นักพัฒนา", active: true },
  { name: "ทอม โอคาฟอร์", key: "Tom", email: "tom@devpulse.io", role: "นักพัฒนา", active: true },
  { name: "ซาร่า ลินด์ควิสต์", key: "Sara", email: "sara@devpulse.io", role: "QA", active: true },
  { name: "เบน คาร์เตอร์", key: "Ben", email: "ben@devpulse.io", role: "นักพัฒนา", active: false },
];

export const USERS: User[] = USERS_SEED.map((u, i) => ({
  id: `u${i + 1}`,
  roleCode: "DEVELOPER",
  requiresDailyReport: true,
  ...u,
}));

export const ROLE_OPTIONS = ["หัวหน้าทีม", "ผู้ดูแลระบบ", "นักพัฒนา", "QA"];

/* ------------------------------------------------------------------ */
/* Team calendar — July 2026 (พ.ศ. 2569), 1 Jul falls on Wednesday     */
/* ------------------------------------------------------------------ */

export type CalendarEvent = { label: string; type: "leave" | "task" };

export const CALENDAR_EVENTS: Record<number, CalendarEvent[]> = {
  8: [{ label: "ซาร่า · ลาป่วย", type: "leave" }],
  10: [{ label: "OAuth ครบกำหนด", type: "task" }],
  11: [{ label: "Push ครบกำหนด", type: "task" }],
  14: [{ label: "Rate limit ครบกำหนด", type: "task" }],
  15: [{ label: "กราฟ v2 ครบกำหนด", type: "task" }],
  16: [{ label: "แผน QA ครบกำหนด", type: "task" }],
  20: [{ label: "ทอม · ลาพักร้อน", type: "leave" }],
  21: [
    { label: "ทอม · ลาพักร้อน", type: "leave" },
    { label: "Terraform ครบกำหนด", type: "task" },
  ],
  22: [{ label: "ทอม · ลาพักร้อน", type: "leave" }],
  23: [{ label: "ทอม · ลาพักร้อน", type: "leave" }],
  24: [
    { label: "ทอม · ลาพักร้อน", type: "leave" },
    { label: "รีลีส 2.4", type: "task" },
  ],
};

export const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const CALENDAR_TODAY = 9;
export const CALENDAR_LEADING_BLANKS = 3; // 1 Jul 2026 = Wednesday (Sun-first grid)
export const CALENDAR_DAYS_IN_MONTH = 31;

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type LeaveTypeSetting = {
  name: string;
  days: string;
  color: string;
  approval: string;
  approvalBg: string;
  approvalFg: string;
};

export const LEAVE_TYPE_SETTINGS: LeaveTypeSetting[] = [
  { name: "ลาพักร้อน", days: "20 วัน / ปี", color: "#0d9488", approval: "ต้องขออนุมัติ", approvalBg: "#fef3c7", approvalFg: "#b45309" },
  { name: "ลาป่วย", days: "10 วัน / ปี", color: "#f59e0b", approval: "อนุมัติอัตโนมัติ", approvalBg: "#dcfce7", approvalFg: "#15803d" },
  { name: "ลากิจ", days: "5 วัน / ปี", color: "#8b5cf6", approval: "ต้องขออนุมัติ", approvalBg: "#fef3c7", approvalFg: "#b45309" },
  { name: "ลาเลี้ยงดูบุตร", days: "ตามนโยบายบริษัท", color: "#3b82f6", approval: "ต้องขออนุมัติ", approvalBg: "#fef3c7", approvalFg: "#b45309" },
];
