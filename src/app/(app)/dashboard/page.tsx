"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TriangleAlert,
  Plus,
  FileText,
  CalendarClock,
  KanbanSquare,
  CheckCircle2,
  Clock,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageTasks } from "@/lib/permissions";
import { relativeTimeTh } from "@/lib/utils";
import { getThaiGreeting, formatThaiDateFull } from "@/lib/thai-datetime";
import type { ApiActivity, ApiUserMini } from "@/lib/mappers";
import { CURRENT_USER } from "@/lib/mock-data";

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
  topBlockers: {
    id: string;
    text: string;
    author: ApiUserMini;
    project: { name: string; code: string; color: string };
    date: string;
  }[];
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
    project: { name: string; code: string; color: string };
    updatedAt: string;
  }[];
};

type Summary = {
  stats: { pendingLeaves: number };
  recentActivity: ApiActivity[];
};

const ACTION_DOT: Record<string, string> = {
  "task.status": "#7c3aed",
  "task.create": "#3b82f6",
  "task.update": "#3b82f6",
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
};

export default function DashboardPage() {
  const me = useCurrentUser();
  const displayName =
    me?.name?.trim() || me?.email?.split("@")[0] || CURRENT_USER.name;
  const firstName = displayName.split(" ")[0];
  const canCreateTask = canManageTasks(me);

  // Greeting/date depend on the current Bangkok time — compute after mount so
  // the static prerender doesn't lock in a build-time value (hydration-safe).
  const [clock, setClock] = useState<{ greeting: string; date: string } | null>(
    null
  );
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

  const stats = [
    { label: "งานทั้งหมด", value: t ? String(t.total) : "—", sub: `เสร็จแล้ว ${t?.completionRate ?? 0}%`, dot: "#3b82f6" },
    { label: "งานที่เสร็จแล้ว", value: t ? String(t.done) : "—", sub: "ทั้งหมด", dot: "#10b981" },
    { label: "งานกำลังทำ", value: t ? String(t.inProgress) : "—", sub: `รอตรวจ ${t?.review ?? 0}`, dot: "#7c3aed" },
    { label: "งานเกินกำหนด", value: t ? String(t.overdue) : "—", sub: `ครบกำหนดวันนี้ ${t?.dueToday ?? 0}`, dot: "#e11d48" },
    { label: "รายงานวันนี้", value: r ? `${r.submittedCount}/${r.totalMembers}` : "—", sub: "ส่งแล้ววันนี้", dot: "#0d9488" },
    { label: "อุปสรรค", value: insights ? String(insights.topBlockers.length) : "—", sub: "ต้องการความช่วยเหลือ", dot: "#f59e0b" },
  ];

  const activityItems = (summary?.recentActivity ?? []).map((a) => ({
    who: a.user.name,
    what: a.message.startsWith(a.user.name)
      ? a.message.slice(a.user.name.length).trim()
      : a.message,
    time: relativeTimeTh(a.createdAt),
    dot: ACTION_DOT[a.action] ?? "#a1a1aa",
  }));

  return (
    <div className="flex flex-col gap-5 px-7 py-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
            DASHBOARD · {clock?.date ?? " "}
          </div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[19px] font-bold tracking-[-0.02em]">
              {clock?.greeting ?? "สวัสดี"} คุณ{firstName}
            </h1>
            <span className="text-[13px] text-zinc-500">
              นี่คือภาพรวมงานของทีมวันนี้
            </span>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2.5">
        {canCreateTask && (
          <QuickAction href="/tasks" icon={<KanbanSquare className="size-4" />} label="สร้างงาน" />
        )}
        <QuickAction href="/reports/new" icon={<Plus className="size-4" />} label="เขียนรายงาน" />
        <QuickAction href="/leaves/new" icon={<CalendarClock className="size-4" />} label="ขอลา" />
        <QuickAction href="/reports" icon={<FileText className="size-4" />} label="ดูรายงาน" />
      </div>

      {/* Error */}
      {error && !insights && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-[13px] text-red-800">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</span>
          <button
            onClick={load}
            className="rounded-[7px] border border-red-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-red-700 hover:bg-red-100"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((st) => (
          <StatCard key={st.label} {...st} />
        ))}
      </div>

      {/* Overdue banner */}
      {!!t?.overdue && (
        <div className="flex items-center gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-[11px]">
          <TriangleAlert className="size-4 flex-none text-red-700" strokeWidth={2} />
          <span className="flex-1 text-[13px] text-red-900">
            <strong>มีงานเกินกำหนด {t.overdue} งาน</strong> — ควรติดตามหรือปรับกำหนดส่ง
          </span>
          <Link
            href="/tasks"
            className="rounded-[7px] border border-red-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            เปิดบอร์ดงาน
          </Link>
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Workload by person */}
          <Card>
            <CardHeader>
              <CardTitle>ภาระงานของทีม</CardTitle>
              <Link href="/tasks" className="text-[12.5px] font-medium text-teal-600 hover:underline">
                เปิดบอร์ดงาน
              </Link>
            </CardHeader>
            <div className="flex flex-col">
              {(insights?.workload ?? []).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <Avatar userKey={w.avatarKey} size={28} fontSize={10.5} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {w.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <WorkloadPill count={w.inProgress} label="กำลังทำ" tone="violet" />
                    <WorkloadPill count={w.todo} label="รอทำ" tone="zinc" />
                    <WorkloadPill count={w.review} label="รอตรวจ" tone="amber" />
                  </div>
                  {w.open === 0 ? (
                    <span className="w-[52px] text-right text-[11.5px] font-medium text-emerald-600">
                      ว่าง
                    </span>
                  ) : (
                    <span className="w-[52px] text-right text-[11.5px] text-zinc-400">
                      {w.open} งาน
                    </span>
                  )}
                </div>
              ))}
              {insights && insights.workload.length === 0 && (
                <div className="px-[18px] py-6 text-center text-[12.5px] text-zinc-400">
                  ยังไม่มีข้อมูลภาระงาน
                </div>
              )}
              {loading && !insights && <RowSkeleton rows={4} />}
            </div>
          </Card>

          {/* Recently completed */}
          <Card>
            <CardHeader>
              <CardTitle>งานที่เพิ่งเสร็จ</CardTitle>
            </CardHeader>
            <div className="flex flex-col">
              {(insights?.recentlyCompleted ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <CheckCircle2 className="size-4 flex-none text-emerald-500" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{c.title}</span>
                  <span
                    className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: `${c.project.color}22`, color: c.project.color }}
                  >
                    {c.project.code}
                  </span>
                  {c.assignee && <Avatar userKey={c.assignee.avatarKey} size={22} fontSize={9} />}
                </div>
              ))}
              {insights && insights.recentlyCompleted.length === 0 && (
                <div className="px-[18px] py-6 text-center text-[12.5px] text-zinc-400">
                  ยังไม่มีงานที่เสร็จ
                </div>
              )}
              {loading && !insights && <RowSkeleton rows={3} />}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Daily report status */}
          <Card>
            <CardHeader>
              <CardTitle>สถานะรายงานวันนี้</CardTitle>
              <Link href="/reports" className="text-[12.5px] font-medium text-teal-600 hover:underline">
                ดูทั้งหมด
              </Link>
            </CardHeader>
            <div className="px-[18px] py-3">
              <div className="mb-2.5 flex items-center gap-2 text-[12px] text-zinc-500">
                <ListTodo className="size-3.5" />
                ส่งแล้ว {r?.submittedCount ?? 0}/{r?.totalMembers ?? 0} คน
              </div>
              {r && r.missing.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {r.missing.map((u) => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-0.5 pl-0.5 pr-2 text-[11.5px] text-amber-800"
                    >
                      <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                      {u.name.split(" ")[0]}
                    </span>
                  ))}
                </div>
              ) : (
                r && (
                  <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    ทุกคนส่งรายงานแล้ว
                  </div>
                )
              )}
              {loading && !insights && <RowSkeleton rows={2} />}
            </div>
          </Card>

          {/* Top blockers */}
          <Card>
            <CardHeader>
              <CardTitle>อุปสรรคล่าสุด</CardTitle>
            </CardHeader>
            <div className="flex flex-col">
              {(insights?.topBlockers ?? []).map((b) => (
                <div
                  key={b.id}
                  className="border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-3.5 flex-none text-amber-500" />
                    <p className="flex-1 text-[12.5px] leading-snug text-zinc-700">{b.text}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 pl-[22px] text-[11px] text-zinc-400">
                    <Avatar userKey={b.author.avatarKey} size={16} fontSize={7.5} />
                    {b.author.name} · {b.project.name}
                  </div>
                </div>
              ))}
              {insights && insights.topBlockers.length === 0 && (
                <div className="flex items-center gap-2 px-[18px] py-6 text-[12.5px] text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  ไม่มีอุปสรรคที่ค้างอยู่
                </div>
              )}
              {loading && !insights && <RowSkeleton rows={3} />}
            </div>
          </Card>

          {/* Team activity */}
          <Card>
            <div className="flex items-center gap-2 border-b border-hairline px-[18px] py-3.5 text-[13.5px] font-semibold">
              <Clock className="size-4 text-zinc-400" />
              กิจกรรมของทีม
            </div>
            {activityItems.length > 0 ? (
              <ActivityFeed items={activityItems} />
            ) : (
              <div className="px-[18px] py-6 text-center text-[12.5px] text-zinc-400">
                {loading ? "กำลังโหลด…" : "ยังไม่มีกิจกรรม"}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
    >
      <span className="text-teal-600">{icon}</span>
      {label}
    </Link>
  );
}

const PILL_TONE: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700",
  zinc: "bg-zinc-100 text-zinc-600",
  amber: "bg-amber-50 text-amber-700",
};

function WorkloadPill({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: string;
}) {
  if (!count) return null;
  return (
    <span
      className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${PILL_TONE[tone]}`}
      title={label}
    >
      {count}
    </span>
  );
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-[18px] py-2.5">
          <div className="size-7 flex-none animate-pulse rounded-full bg-zinc-100" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}
