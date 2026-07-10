"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TriangleAlert,
  Plus,
  FileText,
  CalendarClock,
  KanbanSquare,
  CheckCircle2,
  Clock,
  RefreshCw,
  ClipboardCheck,
  Loader2,
  AlarmClock,
  Plane,
  Stamp,
  FolderKanban,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ActivityFeed } from "@/components/activity-feed";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageTasks } from "@/lib/permissions";
import { relativeTimeTh, cn } from "@/lib/utils";
import { getThaiGreeting, formatThaiDateFull, bangkokDateISO } from "@/lib/thai-datetime";
import type { ApiActivity, ApiUserMini } from "@/lib/mappers";
import { CURRENT_USER } from "@/lib/mock-data";

type Proj = { name: string; code: string; color: string };

type Insights = {
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    completionRate: number;
  };
  reports: {
    date: string;
    submittedCount: number;
    totalMembers: number;
    submitted: ApiUserMini[];
    missing: ApiUserMini[];
  };
  topBlockers: { id: string; text: string; author: ApiUserMini; project: Proj; date: string }[];
  workload: {
    id: string;
    name: string;
    avatarKey: string;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    open: number;
    total: number;
  }[];
  recentlyCompleted: {
    id: string;
    title: string;
    assignee: ApiUserMini | null;
    project: Proj;
    updatedAt: string;
  }[];
};

type Summary = {
  stats: { pendingLeaves: number };
  recentActivity: ApiActivity[];
  projectProgress: { id: string; name: string; done: number; total: number; percent: number }[];
  upcomingLeaves: {
    id: string;
    user: ApiUserMini;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
};

const ACTION_DOT: Record<string, string> = {
  "task.status": "#7c3aed",
  "task.create": "#3b82f6",
  "task.update": "#3b82f6",
  "task.assignees": "#3b82f6",
  "report.create": "#0d9488",
  "report.update": "#0d9488",
  "leave.create": "#f59e0b",
  "leave.approve": "#10b981",
  "leave.reject": "#e11d48",
  "user.create": "#3b82f6",
  "user.update": "#3b82f6",
  "role.create": "#8b5cf6",
  "profile.update": "#a1a1aa",
  "password.change": "#a1a1aa",
  "comment.create": "#0ea5e9",
};

export default function DashboardPage() {
  const me = useCurrentUser();
  const displayName = me?.name?.trim() || me?.email?.split("@")[0] || CURRENT_USER.name;
  const firstName = displayName.split(" ")[0];
  const canCreateTask = canManageTasks(me);

  const [clock, setClock] = useState<{ greeting: string; date: string } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock({ greeting: getThaiGreeting(), date: formatThaiDateFull() });
  }, []);

  const [insights, setInsights] = useState<Insights | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      api.get<Insights>("/api/dashboard/insights"),
      api.get<Summary>("/api/dashboard/summary"),
    ])
      .then(([i, s]) => {
        setInsights(i);
        setSummary(s);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const t = insights?.tasks;
  const r = insights?.reports;

  // Derived per-user status (report submitted / has blocker) for the workload.
  const submittedIds = useMemo(
    () => new Set((r?.submitted ?? []).map((u) => u.id)),
    [r]
  );
  const blockerAuthorIds = useMemo(
    () => new Set((insights?.topBlockers ?? []).map((b) => b.author.id)),
    [insights]
  );

  const onLeaveToday = useMemo(() => {
    const today = bangkokDateISO();
    return (summary?.upcomingLeaves ?? []).filter(
      (l) => l.status === "APPROVED" && l.startDate.slice(0, 10) <= today && l.endDate.slice(0, 10) >= today
    );
  }, [summary]);

  const kpis = [
    { label: "งานทั้งหมด", value: t?.total, sub: `${t?.completionRate ?? 0}% เสร็จ`, icon: <KanbanSquare className="size-[18px]" />, color: "#3b82f6" },
    { label: "กำลังทำ", value: t?.inProgress, sub: `รอตรวจ ${t?.review ?? 0}`, icon: <Loader2 className="size-[18px]" />, color: "#7c3aed" },
    { label: "เสร็จแล้ว", value: t?.done, sub: "งานที่ปิดแล้ว", icon: <CheckCircle2 className="size-[18px]" />, color: "#10b981" },
    { label: "เกินกำหนด", value: t?.overdue, sub: `วันนี้ ${t?.dueToday ?? 0}`, icon: <AlarmClock className="size-[18px]" />, color: "#e11d48" },
    { label: "รายงานวันนี้", value: r ? `${r.submittedCount}/${r.totalMembers}` : undefined, sub: "ส่งแล้ว", icon: <ClipboardCheck className="size-[18px]" />, color: "#0d9488" },
    { label: "อุปสรรค", value: insights?.topBlockers.length, sub: "ต้องช่วยแก้", icon: <TriangleAlert className="size-[18px]" />, color: "#f59e0b" },
    { label: "ลาวันนี้", value: onLeaveToday.length, sub: "อนุมัติแล้ว", icon: <Plane className="size-[18px]" />, color: "#f97316" },
    { label: "รออนุมัติลา", value: summary?.stats.pendingLeaves, sub: "คำขอค้าง", icon: <Stamp className="size-[18px]" />, color: "#6366f1" },
  ];

  const activityItems = (summary?.recentActivity ?? []).map((a) => ({
    who: a.user.name,
    what: a.message.startsWith(a.user.name) ? a.message.slice(a.user.name.length).trim() : a.message,
    time: relativeTimeTh(a.createdAt),
    dot: ACTION_DOT[a.action] ?? "#a1a1aa",
  }));

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-7">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-teal-600">
            DASHBOARD · {clock?.date ?? " "}
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">
            {clock?.greeting ?? "สวัสดี"} คุณ{firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            นี่คือภาพรวมงานของทีมวันนี้
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onLeaveToday.length > 0 && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 sm:flex">
              <Plane className="size-3.5 text-orange-500" />
              <span className="text-[12px] text-muted-foreground">ลาวันนี้</span>
              <div className="flex -space-x-1.5">
                {onLeaveToday.slice(0, 4).map((l) => (
                  <span key={l.id} className="rounded-full ring-2 ring-[color:var(--card)]" title={l.user.name}>
                    <Avatar userKey={l.user.avatarKey} size={20} fontSize={8} />
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-muted dark:text-zinc-300"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {canCreateTask && <QuickAction href="/tasks" icon={<KanbanSquare className="size-4" />} label="สร้างงาน" />}
        <QuickAction href="/reports/new" icon={<Plus className="size-4" />} label="เขียนรายงาน" />
        <QuickAction href="/leaves/new" icon={<CalendarClock className="size-4" />} label="ขอลา" />
        <QuickAction href="/standup" icon={<ClipboardCheck className="size-4" />} label="ประชุมเช้า" />
        <QuickAction href="/reports" icon={<FileText className="size-4" />} label="ดูรายงาน" />
      </div>

      {error && !insights && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="text-[13px] text-red-800 dark:text-red-300">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</span>
          <button onClick={load} className="rounded-lg border border-red-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-red-700 hover:bg-red-100 dark:text-red-300">
            ลองใหม่
          </button>
        </div>
      )}

      {/* KPI grid — compact + informative */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} loading={!insights} />
        ))}
      </div>

      {/* Overdue banner */}
      {!!t?.overdue && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-[11px] dark:border-red-900/50 dark:bg-red-950/30">
          <TriangleAlert className="size-4 flex-none text-red-600" strokeWidth={2} />
          <span className="flex-1 text-[13px] leading-relaxed text-red-900 dark:text-red-200">
            <strong>มีงานเกินกำหนด {t.overdue} งาน</strong> — ควรติดตามหรือปรับกำหนดส่ง
          </span>
          <Link href="/tasks" className="flex-none rounded-lg border border-red-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-100 dark:text-red-300">
            เปิดบอร์ดงาน
          </Link>
        </div>
      )}

      {/* Main area */}
      <div className="grid grid-cols-1 items-start gap-4 xl:[grid-template-columns:1.6fr_1fr]">
        {/* Left column: workload + recently completed */}
        <div className="flex flex-col gap-4">
        <Card className="flex max-h-[440px] flex-col overflow-hidden">
          <CardHeader className="flex-none">
            <CardTitle>ภาระงานของทีม</CardTitle>
            <Link href="/tasks" className="text-[12.5px] font-medium text-teal-600 hover:underline">
              เปิดบอร์ดงาน
            </Link>
          </CardHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && !insights ? (
              <RowSkeleton rows={6} />
            ) : insights && insights.workload.length === 0 ? (
              <div className="px-[18px] py-8 text-center text-[13px] text-muted-foreground">ยังไม่มีข้อมูลภาระงาน</div>
            ) : (
              (insights?.workload ?? []).map((w) => (
                <WorkloadRow
                  key={w.id}
                  w={w}
                  submitted={submittedIds.has(w.id)}
                  hasBlocker={blockerAuthorIds.has(w.id)}
                />
              ))
            )}
          </div>
        </Card>

          {/* Recently completed */}
          <Card className="flex max-h-[320px] flex-col overflow-hidden">
            <CardHeader className="flex-none">
              <CardTitle>งานที่เพิ่งเสร็จ</CardTitle>
            </CardHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && !insights ? (
                <RowSkeleton rows={4} />
              ) : insights && insights.recentlyCompleted.length === 0 ? (
                <div className="px-[18px] py-6 text-center text-[13px] text-muted-foreground">ยังไม่มีงานที่เสร็จ</div>
              ) : (
                (insights?.recentlyCompleted ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0">
                    <CheckCircle2 className="size-4 flex-none text-emerald-500" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700 dark:text-zinc-200">{c.title}</span>
                    <span className="flex-none rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${c.project.color}22`, color: c.project.color }}>
                      {c.project.code}
                    </span>
                    {c.assignee && <Avatar userKey={c.assignee.avatarKey} size={20} fontSize={8.5} />}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right column: report status + blockers + activity */}
        <div className="flex flex-col gap-4">
          {/* Report status */}
          <Card>
            <CardHeader>
              <CardTitle>สถานะรายงานวันนี้</CardTitle>
              <Link href="/standup" className="text-[12.5px] font-medium text-teal-600 hover:underline">
                ประชุมเช้า
              </Link>
            </CardHeader>
            <div className="px-[18px] py-3.5">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MiniStat label="ส่งแล้ว" value={r?.submittedCount ?? 0} total={r?.totalMembers} tone="emerald" />
                <MiniStat label="ยังไม่ส่ง" value={r?.missing.length ?? 0} tone="amber" />
              </div>
              {r && r.missing.length > 0 ? (
                <div>
                  <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">ยังไม่ส่ง</div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.missing.map((u) => (
                      <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-0.5 pl-0.5 pr-2 text-[11.5px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                        {u.name.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                r && (
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" /> ทุกคนส่งรายงานแล้ว
                  </div>
                )
              )}
              {loading && !insights && <div className="h-16 animate-pulse rounded-lg bg-muted" />}
            </div>
          </Card>

          {/* Blockers */}
          <Card className="flex max-h-[360px] flex-col overflow-hidden">
            <CardHeader className="flex-none">
              <CardTitle>อุปสรรคล่าสุด</CardTitle>
              {!!insights?.topBlockers.length && (
                <Link href="/reports" className="text-[12.5px] font-medium text-teal-600 hover:underline">ดูรายงาน</Link>
              )}
            </CardHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && !insights ? (
                <RowSkeleton rows={3} />
              ) : insights && insights.topBlockers.length === 0 ? (
                <div className="flex items-center gap-2 px-[18px] py-6 text-[13px] font-medium text-emerald-600">
                  <CheckCircle2 className="size-4" /> ไม่มีอุปสรรคที่ค้างอยู่
                </div>
              ) : (
                (insights?.topBlockers ?? []).map((b) => (
                  <Link key={b.id} href="/reports" className="border-b border-hairline-soft px-[18px] py-3 transition-colors last:border-b-0 hover:bg-muted/40">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-950/50">
                        <TriangleAlert className="size-3" />
                      </span>
                      <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200" title={b.text}>{b.text}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 pl-7 text-[11.5px] text-muted-foreground">
                      <Avatar userKey={b.author.avatarKey} size={16} fontSize={7.5} />
                      {b.author.name}
                      <span className="rounded-[4px] px-1 py-px text-[10px] font-semibold" style={{ background: `${b.project.color}22`, color: b.project.color }}>
                        {b.project.code}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Recent activity */}
          <Card className="flex max-h-[380px] flex-col overflow-hidden">
            <div className="flex flex-none items-center gap-2 border-b border-hairline px-[18px] py-3.5 text-[14px] font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              กิจกรรมของทีม
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && !summary ? (
                <RowSkeleton rows={4} />
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="px-[18px] py-6 text-center text-[13px] text-muted-foreground">ยังไม่มีกิจกรรม</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Project progress — full width, bounded */}
      <Card className="flex max-h-[300px] flex-col overflow-hidden">
        <CardHeader className="flex-none">
          <CardTitle>ความคืบหน้าโปรเจกต์</CardTitle>
          <Link href="/projects" className="text-[12.5px] font-medium text-teal-600 hover:underline">โปรเจกต์</Link>
        </CardHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
          {loading && !summary ? (
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}
            </div>
          ) : summary && summary.projectProgress.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
              <FolderKanban className="size-4" /> ยังไม่มีโปรเจกต์
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {(summary?.projectProgress ?? []).map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium">{p.name}</span>
                    <span className="flex-none text-[11.5px] text-muted-foreground tabular-nums">{p.done}/{p.total} · {p.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${p.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ pieces --------------------------------- */

function Kpi({
  icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | undefined;
  sub: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex min-h-[86px] items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="flex size-9 flex-none items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11.5px] font-medium text-muted-foreground">{label}</div>
        {loading ? (
          <div className="mt-1 h-4 w-10 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold leading-none tabular-nums">{value ?? "—"}</span>
            <span className="truncate text-[11px] text-muted-foreground">{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MINI_TONE: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
};

function MiniStat({ label, value, total, tone }: { label: string; value: number; total?: number; tone: string }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", MINI_TONE[tone])}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="text-[18px] font-bold leading-tight tabular-nums">
        {value}
        {total !== undefined && <span className="text-[12px] font-medium opacity-60">/{total}</span>}
      </div>
    </div>
  );
}

const PILLS = [
  { key: "inProgress", label: "กำลังทำ", cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
  { key: "review", label: "รอตรวจ", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { key: "todo", label: "รอทำ", cls: "bg-muted text-zinc-600 dark:text-zinc-300" },
] as const;

function WorkloadRow({
  w,
  submitted,
  hasBlocker,
}: {
  w: Insights["workload"][number];
  submitted: boolean;
  hasBlocker: boolean;
}) {
  const percent = w.total ? Math.round((w.done / w.total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 border-b border-hairline-soft px-4 py-2.5 last:border-b-0">
      <Avatar userKey={w.avatarKey} size={30} fontSize={11} />
      <div className="w-[128px] min-w-0 flex-none">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{w.name}</span>
          {hasBlocker && <TriangleAlert className="size-3 flex-none text-amber-500" aria-label="มีอุปสรรค" />}
        </div>
        <div className="flex items-center gap-1 text-[10.5px]">
          <span className={cn("size-1.5 rounded-full", submitted ? "bg-emerald-500" : "bg-amber-400")} />
          <span className={submitted ? "text-emerald-600" : "text-amber-600"}>
            {submitted ? "ส่งรายงานแล้ว" : "ยังไม่ส่ง"}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {PILLS.map((p) =>
          w[p.key] ? (
            <span key={p.key} className={cn("rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold", p.cls)} title={p.label}>
              {w[p.key]} {p.label}
            </span>
          ) : null
        )}
        {w.open === 0 && <span className="text-[11.5px] font-medium text-emerald-600">ว่าง</span>}
      </div>
      <div className="hidden w-[86px] flex-none sm:block">
        <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{w.done}/{w.total}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:text-zinc-200 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
    >
      <span className="text-teal-600">{icon}</span>
      {label}
    </Link>
  );
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-[18px] py-3">
          <div className="size-7 flex-none animate-pulse rounded-full bg-muted" />
          <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
