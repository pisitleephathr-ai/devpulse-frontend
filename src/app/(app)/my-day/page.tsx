"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  TriangleAlert,
  CalendarClock,
  FileText,
  ClipboardList,
  ListChecks,
  ArrowRight,
  CalendarOff,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { bangkokDateISO, formatThaiDateFull } from "@/lib/thai-datetime";
import { formatThaiDate } from "@/lib/mappers";
import { cn } from "@/lib/utils";
import { isClosedStatus, type Task } from "@/lib/mock-data";

/* --------------------------------- meta --------------------------------- */

const STATUS_META: Record<string, { color: string }> = {
  Todo: { color: "#a1a1aa" },
  "In Progress": { color: "#3b82f6" },
  "Dev Review": { color: "#8b5cf6" },
  "Dev Done": { color: "#06b6d4" },
  Testing: { color: "#f59e0b" },
  "Delivery Done": { color: "#10b981" },
  "Delivery Fail": { color: "#ef4444" },
};
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  High: { label: "สูง", color: "#e11d48" },
  Medium: { label: "กลาง", color: "#f59e0b" },
  Low: { label: "ต่ำ", color: "#a1a1aa" },
};

type ApiUserMini = { id: string; name: string; avatarKey: string };
type ActionItem = {
  id: string;
  text: string;
  status: "OPEN" | "DONE";
  date: string;
  dueDate: string | null;
  assignee: ApiUserMini | null;
  createdBy: ApiUserMini;
  carried: boolean;
};
type ActionResp = { open: ActionItem[]; doneToday: ActionItem[] };

function shortThai(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(d);
}

/* ================================= Page ================================= */

export default function MyDayPage() {
  const me = useCurrentUser();
  const { tasks, reports, users } = useData();
  const today = bangkokDateISO();

  // Greeting by Bangkok hour.
  const greeting = useMemo(() => {
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );
    if (h < 12) return "สวัสดีตอนเช้า";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  }, []);
  const firstName = (me?.name ?? "").split(" ")[0];

  /* ---- my open tasks, grouped by urgency ---- */
  const groups = useMemo(() => {
    const mine = tasks.filter(
      (t) => !isClosedStatus(t.status) && me && t.assignees.some((a) => a.id === me.id)
    );
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndIso = bangkokDateISO(weekEnd);
    const prioRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const sort = (a: Task, b: Task) =>
      (a.dueISO ?? "9999").localeCompare(b.dueISO ?? "9999") ||
      (prioRank[a.pri] ?? 3) - (prioRank[b.pri] ?? 3);

    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const soon: Task[] = [];
    const later: Task[] = [];
    for (const t of mine) {
      if (t.dueISO && t.dueISO < today) overdue.push(t);
      else if (t.dueISO === today) dueToday.push(t);
      else if (t.dueISO && t.dueISO <= weekEndIso) soon.push(t);
      else later.push(t);
    }
    [overdue, dueToday, soon, later].forEach((g) => g.sort(sort));
    return { overdue, dueToday, soon, later, total: mine.length };
  }, [tasks, me, today]);

  /* ---- my report status today ---- */
  const meUser = users.find((u) => u.key === me?.avatarKey);
  const requiresReport = meUser?.requiresDailyReport ?? true;
  const todayThai = formatThaiDate(new Date());
  const myReport = reports.find((r) => r.key === me?.avatarKey && r.date === todayThai);
  const submittedToday = !!myReport && myReport.status !== "ฉบับร่าง";
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  useEffect(() => {
    api
      .get<{ isWorkingDay: boolean }>("/api/reports/workday")
      .then((r) => setIsWorkingDay(r.isWorkingDay))
      .catch(() => {});
  }, []);
  const needsReport = requiresReport && !submittedToday && isWorkingDay;

  /* ---- my open action items ---- */
  const [actions, setActions] = useState<ActionItem[]>([]);
  function loadActions() {
    api
      .get<ActionResp>(`/api/action-items?date=${today}`)
      .then((r) => setActions(r.open.filter((i) => i.assignee?.id === me?.id)))
      .catch(() => {});
  }
  useEffect(() => {
    if (me?.id) loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, today]);

  async function completeAction(it: ActionItem) {
    setActions((prev) => prev.filter((x) => x.id !== it.id)); // optimistic
    try {
      await api.patch(`/api/action-items/${it.id}`, { status: "DONE" });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "อัปเดตไม่สำเร็จ");
      loadActions();
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-7">
      <PageHeader
        eyebrow="MY DAY"
        title={firstName ? `${greeting}, ${firstName}` : "งานของฉัน"}
        description={formatThaiDateFull(new Date())}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="เลยกำหนด" value={groups.overdue.length} tone={groups.overdue.length > 0 ? "danger" : "ok"} icon={<TriangleAlert className="size-[18px]" />} />
        <Kpi label="ครบกำหนดวันนี้" value={groups.dueToday.length} tone="info" icon={<CalendarClock className="size-[18px]" />} />
        <Kpi label="Action ค้าง" value={actions.length} tone={actions.length > 0 ? "warn" : "ok"} icon={<ClipboardList className="size-[18px]" />} />
        <Kpi
          label="รายงานวันนี้"
          value={isWorkingDay ? (submittedToday ? "ส่งแล้ว" : "ยังไม่ส่ง") : "วันหยุด"}
          tone={!isWorkingDay ? "muted" : submittedToday ? "ok" : "warn"}
          icon={isWorkingDay ? <FileText className="size-[18px]" /> : <CalendarOff className="size-[18px]" />}
        />
      </div>

      {/* Report nudge */}
      {needsReport && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-amber-800 dark:text-amber-200">
            <TriangleAlert className="size-4 flex-none" />
            คุณยังไม่ได้ส่งรายงานประจำวันนี้
          </div>
          <Link href="/reports" className="flex-none rounded-lg bg-amber-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-amber-700">
            ส่งรายงาน
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.55fr_1fr]">
        {/* Tasks */}
        <div className="flex flex-col gap-4">
          <TaskGroup title="เลยกำหนด" accent="#e11d48" tasks={groups.overdue} />
          <TaskGroup title="ครบกำหนดวันนี้" accent="#f59e0b" tasks={groups.dueToday} />
          <TaskGroup title="ภายในสัปดาห์นี้" accent="#0d9488" tasks={groups.soon} />
          <TaskGroup title="ยังไม่มีกำหนด / ภายหลัง" accent="#a1a1aa" tasks={groups.later} defaultCollapsed />
          {groups.total === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="text-[14px] font-semibold">ไม่มีงานค้างของคุณ 🎉</div>
              <p className="text-[12.5px] text-muted-foreground">สบายๆ วันนี้!</p>
            </div>
          )}
        </div>

        {/* Action items */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
              <ListChecks className="size-4 text-teal-600" />
              Action Items ของฉัน ({actions.length})
            </div>
            <Link href="/standup" className="flex items-center gap-0.5 text-[12px] font-medium text-teal-600 hover:underline">
              standup <ArrowRight className="size-3" />
            </Link>
          </div>
          {actions.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
              ไม่มี action item ที่ค้างอยู่
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-hairline-soft">
              {actions.map((it) => {
                const due = it.dueDate ? dueTone(it.dueDate, today) : null;
                return (
                  <div key={it.id} className="group flex items-start gap-2.5 px-4 py-2.5">
                    <button onClick={() => completeAction(it)} className="mt-0.5 flex-none" aria-label="ทำเครื่องหมายเสร็จ">
                      <Circle className="size-[18px] text-zinc-300 transition-colors hover:text-teal-500 dark:text-zinc-600" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-snug text-zinc-700 dark:text-zinc-200 [overflow-wrap:anywhere]">
                        {it.text}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                        {it.carried && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-px font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            ค้างจาก {shortThai(it.date)}
                          </span>
                        )}
                        {due && (
                          <span className={cn("flex items-center gap-1", due.cls)}>
                            <CalendarClock className="size-3" />
                            {shortThai(it.dueDate!)}{due.suffix}
                          </span>
                        )}
                        <span className="text-muted-foreground">โดย {it.createdBy.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Task group ----------------------------- */

function TaskGroup({
  title,
  accent,
  tasks,
  defaultCollapsed,
}: {
  title: string;
  accent: string;
  tasks: Task[];
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  if (tasks.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 border-b border-hairline bg-muted/30 px-4 py-2.5 text-left"
      >
        <span className="size-2 flex-none rounded-full" style={{ background: accent }} />
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </button>
      {!collapsed && (
        <div className="flex flex-col divide-y divide-hairline-soft">
          {tasks.map((t) => (
            <TaskLine key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskLine({ t }: { t: Task }) {
  const st = STATUS_META[t.status] ?? { color: "#a1a1aa" };
  const pr = PRIORITY_META[t.pri] ?? { label: t.pri, color: "#a1a1aa" };
  return (
    <Link
      href={`/tasks?task=${t.id}`}
      className="dp-card-hover flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
    >
      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: pr.color }} title={`ความสำคัญ${pr.label}`}>
        <span className="size-2 rounded-full" style={{ background: pr.color }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-zinc-800 dark:text-zinc-100">{t.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-semibold" style={{ color: t.projFg }}>{t.proj}</span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: st.color }} />
            {t.status}
          </span>
          {t.due && (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {t.due}
            </span>
          )}
          {t.checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" />
              {t.checklistDone}/{t.checklistTotal}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="size-4 flex-none text-zinc-300 dark:text-zinc-600" />
    </Link>
  );
}

/* -------------------------------- helpers ------------------------------- */

function dueTone(iso: string, todayIso: string) {
  const day = iso.slice(0, 10);
  if (day < todayIso) return { cls: "font-semibold text-rose-600 dark:text-rose-400", suffix: " · เลยกำหนด" };
  if (day === todayIso) return { cls: "font-semibold text-amber-600 dark:text-amber-400", suffix: " · วันนี้" };
  return { cls: "text-muted-foreground", suffix: "" };
}

function Kpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  tone: "ok" | "warn" | "danger" | "info" | "muted";
  icon: React.ReactNode;
}) {
  const color = {
    ok: "#0d9488",
    warn: "#f59e0b",
    danger: "#e11d48",
    info: "#3b82f6",
    muted: "#a1a1aa",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="flex size-9 flex-none items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11.5px] text-muted-foreground">{label}</div>
        <div className="text-[18px] font-bold leading-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}
