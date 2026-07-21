"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Presentation,
  LayoutGrid,
  RefreshCw,
  Copy,
  BellRing,
  TriangleAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  X,
  FileText,
  ChevronDown,
  UserPlus,
  ClipboardList,
  AlarmClock,
  CalendarOff,
  CalendarClock,
  ListChecks,
  ExternalLink,
  Paperclip,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Circle,
  CornerUpLeft,
  ListTodo,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useData } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { ReportItemsSections } from "@/components/report-items";
import { EmptyState } from "@/components/empty-state";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { formatThaiDateFull, bangkokDateISO } from "@/lib/thai-datetime";
import { cn } from "@/lib/utils";
import type { ApiUserMini, ApiTaskDetail } from "@/lib/mappers";

/** Lets any nested TaskCard open the shared full-detail modal. */
const TaskModalContext = createContext<(id: string) => void>(() => {});

type Proj = { name: string; code: string; color: string };
type TaskAssignee = { id: string; name: string; avatarKey: string };
type MiniTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: Proj | null;
  assignees: TaskAssignee[];
  checklistTotal: number;
  checklistDone: number;
};
type ReportItem = {
  id: string;
  section?: "DID" | "PLAN";
  title: string;
  progress: number;
  note: string;
};
type Report = {
  id: string;
  user: ApiUserMini;
  did: string;
  plan: string;
  blockers: string;
  project: Proj | null;
  status: string;
  reportCount?: number;
  tasks: MiniTask[];
  items?: ReportItem[];
};
type Standup = {
  date: string;
  isWorkingDay?: boolean;
  holiday?: { name: string; type: string } | null;
  stats: {
    submitted: number;
    missing: number;
    onLeave?: number;
    exempt: number;
    totalRequired: number;
    blockers: number;
    tasksDueToday: number;
  };
  submittedReports: Report[];
  missingUsers: ApiUserMini[];
  onLeaveUsers?: ApiUserMini[];
  exemptUsers: ApiUserMini[];
  blockers: { id: string; user: ApiUserMini; text: string; project: Proj | null }[];
};

type ActionItem = {
  id: string;
  text: string;
  status: "OPEN" | "DONE";
  date: string;
  dueDate: string | null;
  completedAt: string | null;
  assignee: ApiUserMini | null;
  createdBy: ApiUserMini;
  carried: boolean;
};
type ActionResp = {
  date: string;
  open: ActionItem[];
  doneToday: ActionItem[];
  openCount: number;
};

/* -------------------------- task presentation --------------------------- */

const STATUS_META: Record<string, { label: string; color: string }> = {
  TODO: { label: "รอดำเนินการ", color: "#a1a1aa" },
  IN_PROGRESS: { label: "กำลังทำ", color: "#3b82f6" },
  DEV_REVIEW: { label: "รีวิวโค้ด", color: "#8b5cf6" },
  DEV_DONE: { label: "Dev เสร็จ", color: "#06b6d4" },
  TESTING: { label: "กำลังทดสอบ", color: "#f59e0b" },
  DELIVERY_DONE: { label: "ส่งมอบสำเร็จ", color: "#10b981" },
  DELIVERY_FAIL: { label: "ส่งมอบไม่ผ่าน", color: "#ef4444" },
};
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "สูง", color: "#e11d48" },
  MEDIUM: { label: "กลาง", color: "#f59e0b" },
  LOW: { label: "ต่ำ", color: "#a1a1aa" },
};

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, color: "#a1a1aa" };
}
function priorityMeta(p: string) {
  return PRIORITY_META[p] ?? { label: p, color: "#a1a1aa" };
}

/** Short Thai date from an ISO datetime, plus overdue/due-today flags. */
function dueInfo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const label = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(d);
  const dayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const today = bangkokDateISO();
  return { label, overdue: dayIso < today, dueToday: dayIso === today };
}

/**
 * A related task rendered with its real detail: status, priority, due date,
 * checklist progress, project, and assignees. `size="lg"` is used on the
 * full-screen meeting stage.
 */
function TaskCard({ t, size = "sm" }: { t: MiniTask; size?: "sm" | "lg" }) {
  const openTask = useContext(TaskModalContext);
  const st = statusMeta(t.status);
  const pr = priorityMeta(t.priority);
  const due = dueInfo(t.dueDate);
  const accent = t.project?.color ?? "#14b8a6";
  const lg = size === "lg";
  const isDone = t.status === "DELIVERY_DONE";

  return (
    <button
      type="button"
      onClick={() => openTask(t.id)}
      className="dp-card-hover flex w-full gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-teal-300 hover:bg-muted/40 dark:hover:border-teal-800"
    >
      <span className="mt-0.5 w-1 flex-none rounded-full" style={{ background: accent }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "min-w-0 font-medium leading-snug [overflow-wrap:anywhere]",
              lg ? "text-[15px]" : "text-[13px]",
              isDone && "text-muted-foreground line-through"
            )}
          >
            {t.title}
          </span>
          <span
            className="flex-none rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            style={{ background: `${st.color}1f`, color: st.color }}
          >
            {st.label}
          </span>
        </div>
        <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1", lg ? "text-[12.5px]" : "text-[11.5px]")}>
          <span className="flex items-center gap-1 font-medium" style={{ color: pr.color }}>
            <span className="size-1.5 rounded-full" style={{ background: pr.color }} />
            {pr.label}
          </span>
          {t.project && (
            <span className="font-semibold" style={{ color: t.project.color }}>
              {t.project.code}
            </span>
          )}
          {due && (
            <span
              className={cn(
                "flex items-center gap-1",
                due.overdue && !isDone
                  ? "font-semibold text-rose-600 dark:text-rose-400"
                  : due.dueToday && !isDone
                    ? "font-semibold text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              <CalendarClock className="size-3.5" />
              {due.label}
              {due.overdue && !isDone ? " · เลยกำหนด" : due.dueToday && !isDone ? " · วันนี้" : ""}
            </span>
          )}
          {t.checklistTotal > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <ListChecks className="size-3.5" />
              {t.checklistDone}/{t.checklistTotal}
            </span>
          )}
          {t.assignees.length > 0 && (
            <span className="flex items-center gap-1">
              {t.assignees.slice(0, 4).map((a) => (
                <Avatar key={a.id} userKey={a.avatarKey} size={lg ? 20 : 17} fontSize={lg ? 9 : 8} />
              ))}
              {t.assignees.length > 4 && (
                <span className="text-[10.5px] text-muted-foreground">+{t.assignees.length - 4}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function StandupPage() {
  const me = useCurrentUser();
  const canManage = isManagerOrAdmin(me);
  const [data, setData] = useState<Standup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<"overview" | "meeting">("overview");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    api
      .get<Standup>(`/api/standup?date=${bangkokDateISO()}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const taskModal = openTaskId ? (
    <TaskDetailModal key={openTaskId} id={openTaskId} onClose={() => setOpenTaskId(null)} />
  ) : null;

  // Meeting mode is a full-screen presentation overlay (rendered outside the flow).
  if (data && mode === "meeting") {
    return (
      <TaskModalContext.Provider value={setOpenTaskId}>
        <Meeting
          data={data}
          canManage={canManage}
          onExit={() => setMode("overview")}
          navLocked={openTaskId !== null}
        />
        {taskModal}
      </TaskModalContext.Provider>
    );
  }

  return (
    <TaskModalContext.Provider value={setOpenTaskId}>
      <div className="flex flex-col gap-4 px-4 py-6 sm:px-7">
      <PageHeader
        eyebrow="DAILY STANDUP"
        title="ประชุมอัปเดตงานประจำวัน"
        description={data ? formatThaiDateFull(new Date(`${data.date}T12:00:00+07:00`)) : "การประชุมเช้า 08:30"}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setMode("overview")}
                className="flex items-center gap-1.5 bg-teal-600 px-2.5 py-[7px] text-[12.5px] font-medium text-white"
              >
                <LayoutGrid className="size-3.5" /> ภาพรวม
              </button>
              <button
                onClick={() => setMode("meeting")}
                disabled={!data}
                className="flex items-center gap-1.5 border-l border-border bg-card px-2.5 py-[7px] text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-muted disabled:opacity-50 dark:text-zinc-300"
              >
                <Presentation className="size-3.5" /> โหมดประชุม
              </button>
            </div>
            <button
              onClick={load}
              className="flex size-[34px] items-center justify-center rounded-lg border border-border bg-card text-zinc-600 transition-colors hover:bg-muted dark:text-zinc-300"
              aria-label="รีเฟรช"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {loading && !data ? (
        <StandupSkeleton />
      ) : error && !data ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="text-[13px] text-red-800 dark:text-red-300">โหลดข้อมูลไม่สำเร็จ</span>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-card px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-muted dark:text-red-300">
            <RefreshCw className="size-3.5" /> ลองใหม่
          </button>
        </div>
      ) : data ? (
        <Overview data={data} canManage={canManage} meId={me?.id} onRemind={load} onStart={() => setMode("meeting")} />
      ) : null}
      </div>
      {taskModal}
    </TaskModalContext.Provider>
  );
}

/* ------------------------------- Overview ------------------------------- */

function Overview({
  data,
  canManage,
  meId,
  onRemind,
  onStart,
}: {
  data: Standup;
  canManage: boolean;
  meId?: string;
  onRemind: () => void;
  onStart: () => void;
}) {
  const s = data.stats;
  const [reminding, setReminding] = useState(false);

  function copyMissing() {
    const names = data.missingUsers.map((u) => u.name).join(", ");
    navigator.clipboard?.writeText(names).then(
      () => toast(`คัดลอก ${data.missingUsers.length} รายชื่อแล้ว`),
      () => toast("คัดลอกไม่สำเร็จ")
    );
  }
  async function remind() {
    setReminding(true);
    try {
      const r = await api.post<{ notified: number }>("/api/standup/remind", { date: data.date });
      toast(`แจ้งเตือน ${r.notified} คนแล้ว`);
      onRemind();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "แจ้งเตือนไม่สำเร็จ");
    } finally {
      setReminding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {data.isWorkingDay === false && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-[13.5px] font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
          <CalendarOff className="size-5 flex-none" />
          <span>วันนี้เป็นวันหยุด{data.holiday ? ` · ${data.holiday.name}` : ""} — ไม่ต้องส่งรายงานประจำวัน</span>
        </div>
      )}
      {/* KPI row (no exempt) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="ส่งรายงานแล้ว" value={`${s.submitted}/${s.totalRequired}`} sub="ของผู้ที่ต้องส่ง" icon={<CheckCircle2 className="size-[18px]" />} color="#0d9488" />
        <Kpi label="ยังไม่ส่ง" value={String(s.missing)} sub="ต้องติดตาม" icon={<AlarmClock className="size-[18px]" />} color="#f59e0b" />
        <Kpi label="มีอุปสรรค" value={String(s.blockers)} sub="ต้องช่วยแก้" icon={<TriangleAlert className="size-[18px]" />} color="#e11d48" />
        <Kpi label="งานครบกำหนดวันนี้" value={String(s.tasksDueToday)} sub="ทั้งทีม" icon={<ClipboardList className="size-[18px]" />} color="#3b82f6" />
      </div>

      {/* Start meeting CTA */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 dark:border-teal-900/50 dark:bg-teal-950/20">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-teal-600 text-white">
            <Presentation className="size-4" />
          </span>
          <div>
            <div className="text-[13.5px] font-semibold">เริ่มโหมดประชุม</div>
            <div className="text-[12px] text-muted-foreground">แสดงทีละคนสำหรับแชร์หน้าจอ · {s.submitted} คนพร้อมพูด</div>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={s.submitted === 0}
          className="flex flex-none items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          <Presentation className="size-4" /> เริ่มประชุม
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.55fr_1fr]">
        {/* Left: submitted reports (unique users) */}
        <Card className="flex max-h-[640px] flex-col">
          <CardHeader>
            <CardTitle>รายงานของทีม ({data.submittedReports.length})</CardTitle>
          </CardHeader>
          {data.submittedReports.length === 0 ? (
            <EmptyState icon={<FileText className="size-5" />} title="ยังไม่มีรายงานสำหรับวันนี้" description="รอสมาชิกส่งรายงานประจำวัน" />
          ) : (
            <div className="flex flex-col divide-y divide-hairline-soft overflow-y-auto">
              {data.submittedReports.map((r) => (
                <ReportRow key={r.user.id} r={r} />
              ))}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Missing */}
          <Card className="flex max-h-[300px] flex-col">
            <CardHeader>
              <CardTitle>ยังไม่ส่งรายงานวันนี้ ({data.missingUsers.length})</CardTitle>
              {data.missingUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={copyMissing} className="flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:underline">
                    <Copy className="size-3.5" /> คัดลอก
                  </button>
                  {canManage && (
                    <button onClick={remind} disabled={reminding} className="flex items-center gap-1 text-[12px] font-medium text-amber-600 hover:underline disabled:opacity-50">
                      <BellRing className="size-3.5" /> แจ้งเตือน
                    </button>
                  )}
                </div>
              )}
            </CardHeader>
            <div className="overflow-y-auto px-[18px] py-3">
              {data.isWorkingDay === false ? (
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-rose-600 dark:text-rose-400">
                  <CalendarOff className="size-4" /> วันหยุด — ไม่ต้องส่งรายงาน
                </div>
              ) : data.missingUsers.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                  <CheckCircle2 className="size-4" /> ทุกคนส่งรายงานแล้ว
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.missingUsers.map((u) => (
                    <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-0.5 pl-0.5 pr-2 text-[12px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                      {u.name}
                    </span>
                  ))}
                </div>
              )}

              {/* On approved leave today — not expected to report. */}
              {(data.onLeaveUsers?.length ?? 0) > 0 && (
                <div className="mt-3 border-t border-hairline-soft pt-3">
                  <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">
                    ลาวันนี้ ({data.onLeaveUsers!.length}) — ไม่ต้องส่งรายงาน
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.onLeaveUsers!.map((u) => (
                      <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-0.5 pl-0.5 pr-2 text-[12px] text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                        <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Blockers */}
          <Card className="flex max-h-[360px] flex-col">
            <CardHeader>
              <CardTitle>อุปสรรคที่ต้องช่วยแก้ ({data.blockers.length})</CardTitle>
            </CardHeader>
            {data.blockers.length === 0 ? (
              <div className="flex items-center gap-2 px-[18px] py-5 text-[13px] text-emerald-600">
                <CheckCircle2 className="size-4" /> วันนี้ยังไม่มีอุปสรรคที่รายงาน
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-hairline-soft overflow-y-auto">
                {data.blockers.map((b) => (
                  <div key={b.id} className="px-[18px] py-3">
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 size-4 flex-none text-amber-500" />
                      <p className="flex-1 whitespace-pre-line text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200">{b.text}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 pl-6 text-[11.5px] text-muted-foreground">
                      <Avatar userKey={b.user.avatarKey} size={16} fontSize={7.5} />
                      {b.user.name}
                      {b.project && ` · ${b.project.name}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Action items (DB-backed, team-wide) */}
          <ActionItems date={data.date} meId={meId} canManage={canManage} />

          {/* Meeting notes (local, manager) */}
          {canManage && <MeetingNotes date={data.date} />}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex min-h-[76px] items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="flex size-9 flex-none items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11.5px] font-medium text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[19px] font-bold leading-none tabular-nums">{value}</span>
          <span className="truncate text-[11px] text-muted-foreground">{sub}</span>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ r }: { r: Report }) {
  const [showTasks, setShowTasks] = useState(true);
  const hasBlocker = r.blockers.trim().length > 0;
  return (
    <div className="px-[18px] py-3.5">
      <div className="mb-2 flex items-center gap-2.5">
        <Avatar userKey={r.user.avatarKey} size={28} fontSize={10.5} />
        <span className="text-[14px] font-semibold">{r.user.name}</span>
        {r.user.roleRef && (
          <span className="rounded-[5px] bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground">{r.user.roleRef.name}</span>
        )}
        {r.project && (
          <span className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${r.project.color}22`, color: r.project.color }}>
            {r.project.code}
          </span>
        )}
      </div>
      {r.items && r.items.length > 0 ? (
        <ReportItemsSections items={r.items} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="ที่ทำแล้ว" text={r.did} />
            <Field label="วันนี้" text={r.plan} />
          </div>
          {hasBlocker && (
            <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <TriangleAlert className="size-3" /> อุปสรรค
              </div>
              <RichText text={r.blockers} className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200" />
            </div>
          )}
        </>
      )}
      {r.tasks.length > 0 && (
        <div className="mt-2.5">
          <button
            onClick={() => setShowTasks((v) => !v)}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", !showTasks && "-rotate-90")} />
            งานที่เกี่ยวข้อง ({r.tasks.length})
          </button>
          {showTasks && (
            <div className="mt-2 flex flex-col gap-1.5">
              {r.tasks.map((t) => (
                <TaskCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Render text as bullets when multi-line, otherwise a paragraph. Preserves breaks. */
function RichText({ text, className }: { text: string; className?: string }) {
  const lines = (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0)
    return <p className={cn("italic text-zinc-300 dark:text-zinc-600", className)}>—</p>;
  if (lines.length === 1) return <p className={cn("whitespace-pre-line", className)}>{lines[0]}</p>;
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[2px] flex-none opacity-50">•</span>
          <span className="min-w-0">{l}</span>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <RichText text={text} className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200" />
    </div>
  );
}

/* --------------------------- Meeting (full-screen) ---------------------- */

type QItem = { user: ApiUserMini; report: Report | null };

function Meeting({
  data,
  canManage,
  onExit,
  navLocked,
}: {
  data: Standup;
  canManage: boolean;
  onExit: () => void;
  navLocked: boolean;
}) {
  const [includeMissing, setIncludeMissing] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  // Base queue: unique required users who submitted (+ optionally missing users).
  const base = useMemo<QItem[]>(() => {
    const submitted = data.submittedReports.map((r) => ({ user: r.user, report: r }));
    const missing = includeMissing ? data.missingUsers.map((u) => ({ user: u, report: null })) : [];
    return [...submitted, ...missing];
  }, [data, includeMissing]);

  // Reset the order (natural, by name) whenever the base set changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(base.map((q) => q.user.id));
    setIdx(0);
  }, [base]);

  const queue = useMemo<QItem[]>(() => {
    const map = new Map(base.map((q) => [q.user.id, q]));
    return order.map((id) => map.get(id)).filter(Boolean) as QItem[];
  }, [order, base]);

  const total = queue.length;
  const cur = queue[Math.min(idx, Math.max(total - 1, 0))];

  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  function randomize() {
    const ids = base.map((q) => q.user.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrder(ids);
    setIdx(0);
  }

  // Lock body scroll + keyboard controls while the overlay is open. When a task
  // detail modal is open (navLocked), the modal owns the keyboard — don't
  // navigate speakers or exit the meeting from under it.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (navLocked) return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, total - 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [total, onExit, navLocked]);

  const r = cur?.report ?? null;
  const hasBlocker = !!r && r.blockers.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-teal-600 text-white">
            <Presentation className="size-4" />
          </span>
          <div>
            <div className="text-[14px] font-bold leading-tight">ประชุมอัปเดตงานประจำวัน</div>
            <div className="text-[11.5px] text-muted-foreground">{formatThaiDateFull(new Date(`${data.date}T12:00:00+07:00`))}</div>
          </div>
        </div>

        {total > 0 && (
          <div className="order-3 flex w-full items-center gap-3 sm:order-none sm:w-auto sm:flex-1">
            <span className="flex-none text-[13px] font-semibold tabular-nums">คนที่ {idx + 1} จาก {total}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted sm:max-w-[420px]">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setIncludeMissing((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors",
                includeMissing
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-border bg-card text-zinc-600 hover:bg-muted dark:text-zinc-300"
              )}
            >
              <UserPlus className="size-4" /> รวมคนที่ยังไม่ส่ง
            </button>
          )}
          <button
            onClick={randomize}
            disabled={total < 2}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-semibold text-zinc-700 transition-colors hover:bg-muted disabled:opacity-40 dark:text-zinc-200"
          >
            <Shuffle className="size-4" /> สุ่มลำดับ
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <X className="size-4" /> ออกจากโหมดประชุม
          </button>
        </div>
      </div>

      {/* Stage */}
      {total === 0 || !cur ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Presentation className="size-6" />
          </span>
          <div className="text-[18px] font-semibold">ยังไม่มีผู้ส่งรายงานสำหรับวันนี้</div>
          <p className="max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
            คิวการพูดจะสร้างจากผู้ที่ส่งรายงานแล้วเท่านั้น
            {canManage ? " หรือกด “รวมคนที่ยังไม่ส่ง” เพื่อเพิ่มเข้าคิว" : ""}
          </p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
          {/* Speaker header */}
          <div className="flex items-center gap-4">
            <Avatar userKey={cur.user.avatarKey} size={72} fontSize={28} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]">{cur.user.name}</h2>
                {cur.user.roleRef && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">{cur.user.roleRef.name}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground">
                {r?.project && (
                  <span className="font-medium" style={{ color: r.project.color }}>{r.project.name}</span>
                )}
                {r ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-4" /> ส่งรายงานแล้ว</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600"><TriangleAlert className="size-4" /> ยังไม่ได้ส่งรายงาน</span>
                )}
                {r && r.items && r.items.length > 0 && (
                  <span className="inline-flex items-center gap-1"><ClipboardList className="size-4" /> {r.items.length} งานที่ทำ</span>
                )}
                {r && r.tasks.length > 0 && (
                  <span className="inline-flex items-center gap-1"><LayoutGrid className="size-4" /> {r.tasks.length} งานที่เกี่ยวข้อง</span>
                )}
                {hasBlocker && (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600"><TriangleAlert className="size-4" /> มีอุปสรรค</span>
                )}
              </div>
            </div>
          </div>

          {/* Content sections */}
          {!r ? (
            <div className="mt-8 flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-10 text-center text-[18px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
              ยังไม่ได้ส่งรายงานประจำวันนี้
            </div>
          ) : (
            <div className="mt-6 grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:content-start">
              {r.items && r.items.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-2">
                  <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-teal-600">
                    งานที่ทำวันนี้ ({r.items.length})
                  </div>
                  <div className="text-[16px] [&_*]:text-[15px] sm:[&_*]:text-[16px]">
                    <ReportItemsSections items={r.items} />
                  </div>
                </div>
              ) : (
                <>
              <StageSection title="งานที่ทำล่าสุด" text={r.did} tone="neutral" />
              <StageSection title="วันนี้จะทำอะไร" text={r.plan} tone="neutral" />
              <div className="lg:col-span-2">
                {hasBlocker ? (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30 sm:p-6">
                    <div className="mb-2 flex items-center gap-2 text-[15px] font-bold text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="size-5" /> อุปสรรค / ปัญหา
                    </div>
                    <RichText text={r.blockers} className="text-[17px] leading-relaxed text-amber-900 dark:text-amber-100 sm:text-[18px]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 p-5 text-[15px] font-medium text-muted-foreground">
                    <CheckCircle2 className="size-5 text-emerald-500" /> ไม่มีอุปสรรค
                  </div>
                )}
              </div>
                </>
              )}

              {r.tasks.length > 0 && (
                <div className="lg:col-span-2">
                  <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-teal-600">
                    <ClipboardList className="size-4" /> งานที่เกี่ยวข้อง ({r.tasks.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {r.tasks.map((t) => (
                      <TaskCard key={t.id} t={t} size="lg" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom navigation */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold text-zinc-700 transition-colors hover:bg-muted disabled:opacity-40 dark:text-zinc-200"
          >
            <ChevronLeft className="size-5" /> ก่อนหน้า
          </button>
          <span className="text-[13px] text-muted-foreground tabular-nums">{idx + 1} / {total}</span>
          <button
            onClick={next}
            disabled={idx >= total - 1}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
          >
            ถัดไป <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function StageSection({ title, text }: { title: string; text: string; tone?: "neutral" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-teal-600">{title}</div>
      <RichText text={text} className="text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-100 sm:text-[18px]" />
    </div>
  );
}

/* ------------------------ Task detail modal (read-only) ----------------- */

function TaskDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [task, setTask] = useState<ApiTaskDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // The modal mounts fresh per open (keyed by id at the call site), so initial
    // state is already empty — no synchronous reset needed here.
    let alive = true;
    api
      .get<{ task: ApiTaskDetail }>(`/api/tasks/${id}`)
      .then((r) => alive && setTask(r.task))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const st = task ? statusMeta(task.status) : null;
  const pr = task ? priorityMeta(task.priority) : null;
  const due = task ? dueInfo(task.dueDate) : null;
  const assignees = task?.assignees ?? (task?.assignee ? [task.assignee] : []);
  const checklist = task?.checklist ?? [];
  const checkDone = checklist.filter((c) => c.done).length;
  const isDone = task?.status === "DELIVERY_DONE";
  const accent = task?.project?.color ?? "#14b8a6";

  return (
    <div
      onMouseDown={onClose}
      className="dp-scrim fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/45 p-4 sm:p-6"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className="dp-pop flex max-h-[88vh] w-[600px] max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_rgba(0,0,0,0.28)] outline-none"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-hairline bg-muted/30 px-5 py-4">
          <span className="mt-0.5 h-10 w-1.5 flex-none rounded-full" style={{ background: accent }} aria-hidden />
          <div className="min-w-0 flex-1">
            {task ? (
              <>
                <h2 id={titleId} className={cn("text-[16px] font-bold leading-snug [overflow-wrap:anywhere]", isDone && "text-muted-foreground line-through")}>
                  {task.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
                  {task.project && (
                    <span className="font-semibold" style={{ color: task.project.color }}>{task.project.code}</span>
                  )}
                  <span className="text-muted-foreground">{task.project?.name}</span>
                </div>
              </>
            ) : (
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            )}
          </div>
          {st && (
            <span className="flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${st.color}1f`, color: st.color }}>
              {st.label}
            </span>
          )}
          <button
            onClick={onClose}
            className="flex size-8 flex-none items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="py-10 text-center text-[13px] text-red-600 dark:text-red-400">โหลดรายละเอียดงานไม่สำเร็จ</div>
          ) : !task ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> กำลังโหลด…
            </div>
          ) : (
            <>
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <MetaBox label="ความสำคัญ">
                  {pr && (
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: pr.color }}>
                      <span className="size-2 rounded-full" style={{ background: pr.color }} /> {pr.label}
                    </span>
                  )}
                </MetaBox>
                <MetaBox label="ครบกำหนด">
                  {due ? (
                    <span className={cn("flex items-center gap-1.5 font-medium", due.overdue && !isDone ? "text-rose-600 dark:text-rose-400" : due.dueToday && !isDone ? "text-amber-600 dark:text-amber-400" : "")}>
                      <CalendarClock className="size-4" /> {due.label}
                      {due.overdue && !isDone ? " · เลยกำหนด" : due.dueToday && !isDone ? " · วันนี้" : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">ไม่กำหนด</span>
                  )}
                </MetaBox>
              </div>

              {/* Assignees */}
              {assignees.length > 0 && (
                <div>
                  <SectionLabel>ผู้รับผิดชอบ ({assignees.length})</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {assignees.map((a) => (
                      <span key={a.id} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-0.5 pl-0.5 pr-2.5 text-[12px]">
                        <Avatar userKey={a.avatarKey} size={20} fontSize={9} /> {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {task.description?.trim() && (
                <div>
                  <SectionLabel>รายละเอียด</SectionLabel>
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-200 [overflow-wrap:anywhere]">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Checklist */}
              {checklist.length > 0 && (
                <div>
                  <SectionLabel>
                    เช็กลิสต์ <span className="tabular-nums text-muted-foreground">({checkDone}/{checklist.length})</span>
                  </SectionLabel>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${(checkDone / checklist.length) * 100}%` }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    {checklist.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 text-[13px]">
                        <CheckCircle2 className={cn("mt-0.5 size-4 flex-none", c.done ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600")} />
                        <span className={cn("[overflow-wrap:anywhere]", c.done ? "text-muted-foreground line-through" : "text-zinc-700 dark:text-zinc-200")}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {task.links.length > 0 && (
                <div>
                  <SectionLabel>ลิงก์ ({task.links.length})</SectionLabel>
                  <div className="flex flex-col gap-1.5">
                    {task.links.map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[12.5px] text-teal-600 hover:bg-muted dark:text-teal-400">
                        <Link2 className="size-3.5 flex-none" />
                        <span className="min-w-0 flex-1 truncate">{l.title || l.url}</span>
                        <ExternalLink className="size-3.5 flex-none opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {task.attachments.length > 0 && (
                <div>
                  <SectionLabel>ไฟล์แนบ ({task.attachments.length})</SectionLabel>
                  <div className="flex flex-col gap-1.5">
                    {task.attachments.map((a) => (
                      <a key={a.id} href={a.secureUrl || a.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[12.5px] text-zinc-700 hover:bg-muted dark:text-zinc-200">
                        <Paperclip className="size-3.5 flex-none opacity-70" />
                        <span className="min-w-0 flex-1 truncate">{a.displayName || a.originalName || a.fileName}</span>
                        <ExternalLink className="size-3.5 flex-none opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-3">
          <a href="/tasks" className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-muted dark:text-zinc-300">
            เปิดในบอร์ดงาน
          </a>
        </div>
      </div>
    </div>
  );
}

function MetaBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-muted/20 px-3 py-2">
      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

/* ----------------------------- Action items ----------------------------- */

function actionShortThai(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(d);
}

function ActionItems({
  date,
  meId,
  canManage,
}: {
  date: string;
  meId?: string;
  canManage: boolean;
}) {
  const { users } = useData();
  const [open, setOpen] = useState<ActionItem[]>([]);
  const [doneToday, setDoneToday] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get<ActionResp>(`/api/action-items?date=${date}`)
      .then((r) => {
        setOpen(r.open);
        setDoneToday(r.doneToday);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function add() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await api.post("/api/action-items", {
        text: t,
        date,
        assigneeId: assigneeId || null,
        dueDate: due || null,
      });
      setText("");
      setAssigneeId("");
      setDue("");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(it: ActionItem) {
    // Optimistic move between the two lists.
    const next = it.status === "DONE" ? "OPEN" : "DONE";
    try {
      await api.patch(`/api/action-items/${it.id}`, { status: next });
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "อัปเดตไม่สำเร็จ");
    }
  }

  async function remove(it: ActionItem) {
    try {
      await api.del(`/api/action-items/${it.id}`);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const canRemove = (it: ActionItem) => canManage || it.createdBy.id === meId;

  return (
    <Card className="flex max-h-[460px] flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <ListTodo className="size-4 text-teal-600" />
          Action Items ({open.length})
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">ติดตามจนเสร็จ</span>
      </CardHeader>

      {/* Create */}
      <div className="flex flex-col gap-2 border-b border-hairline-soft px-[18px] py-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="เพิ่มสิ่งที่ต้องทำ / ติดตาม…"
          className="text-[13px]"
        />
        <div className="flex items-center gap-2">
          <Select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="flex-1 py-[7px] text-[12.5px]"
          >
            <option value="">— ผู้รับผิดชอบ —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-auto py-[7px] text-[12.5px] text-zinc-600 dark:text-zinc-300"
            title="กำหนดเสร็จ (ไม่บังคับ)"
          />
          <button
            onClick={add}
            disabled={!text.trim() || busy}
            className="flex size-[34px] flex-none items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
            aria-label="เพิ่ม"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col overflow-y-auto">
        {loading ? (
          <div className="px-[18px] py-4">
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ) : open.length === 0 && doneToday.length === 0 ? (
          <div className="px-[18px] py-6 text-center text-[12.5px] text-muted-foreground">
            ยังไม่มี action item — เพิ่มสิ่งที่ทีมต้องติดตามได้เลย
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-hairline-soft">
            {open.map((it) => (
              <ActionRow key={it.id} it={it} onToggle={toggle} onRemove={remove} canRemove={canRemove(it)} />
            ))}
            {doneToday.length > 0 && (
              <div className="px-[18px] py-2.5">
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  เสร็จวันนี้ ({doneToday.length})
                </div>
                <div className="flex flex-col gap-1.5">
                  {doneToday.map((it) => (
                    <ActionRow key={it.id} it={it} onToggle={toggle} onRemove={remove} canRemove={canRemove(it)} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionRow({
  it,
  onToggle,
  onRemove,
  canRemove,
  compact,
}: {
  it: ActionItem;
  onToggle: (it: ActionItem) => void;
  onRemove: (it: ActionItem) => void;
  canRemove: boolean;
  compact?: boolean;
}) {
  const done = it.status === "DONE";
  const due = it.dueDate ? dueInfo(it.dueDate) : null;
  return (
    <div className={cn("group flex items-start gap-2.5", compact ? "" : "px-[18px] py-2.5")}>
      <button
        onClick={() => onToggle(it)}
        className="mt-0.5 flex-none"
        aria-label={done ? "ทำเครื่องหมายยังไม่เสร็จ" : "ทำเครื่องหมายเสร็จ"}
      >
        {done ? (
          <CheckCircle2 className="size-[18px] text-emerald-500" />
        ) : (
          <Circle className="size-[18px] text-zinc-300 transition-colors hover:text-teal-500 dark:text-zinc-600" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[13px] leading-snug [overflow-wrap:anywhere]", done ? "text-muted-foreground line-through" : "text-zinc-700 dark:text-zinc-200")}>
          {it.text}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
            {it.carried && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-px font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <CornerUpLeft className="size-3" /> ค้างจาก {actionShortThai(it.date)}
              </span>
            )}
            {it.assignee && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Avatar userKey={it.assignee.avatarKey} size={16} fontSize={7.5} />
                {it.assignee.name}
              </span>
            )}
            {due && (
              <span className={cn("flex items-center gap-1", due.overdue && !done ? "font-semibold text-rose-600 dark:text-rose-400" : due.dueToday && !done ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                <CalendarClock className="size-3" />
                {due.label}
              </span>
            )}
          </div>
        )}
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(it)}
          className="flex-none text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
          aria-label="ลบ"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* --------------------------- Meeting notes (local) ---------------------- */

function MeetingNotes({ date }: { date: string }) {
  const key = `devpulse_standup_notes_${date}`;
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(window.localStorage.getItem(key) ?? "");
  }, [key]);

  function save() {
    window.localStorage.setItem(key, notes);
    setSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    toast("บันทึกโน้ตการประชุมแล้ว");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>โน้ตการประชุม</CardTitle>
        <span className="text-[11px] text-muted-foreground">บันทึกในเครื่องนี้</span>
      </CardHeader>
      <div className="flex flex-col gap-2 px-[18px] py-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="สรุปการประชุม / สิ่งที่ต้องทำ (action items)…"
          className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none focus:border-teal-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{savedAt ? `บันทึกล่าสุด ${savedAt}` : ""}</span>
          <button onClick={save} className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-teal-700">
            บันทึกโน้ต
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------- Skeleton ------------------------------- */

function StandupSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:[grid-template-columns:1.55fr_1fr]">
        <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
        <div className="flex flex-col gap-4">
          <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
