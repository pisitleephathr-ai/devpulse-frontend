"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { ActivityFeed } from "@/components/activity-feed";
import { api } from "@/lib/api";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  formatThaiRange,
  LEAVE_TYPE_TO_TH,
  type ApiActivity,
  type ApiLeave,
} from "@/lib/mappers";
import { LEAVE_TYPE_COLORS, CURRENT_USER } from "@/lib/mock-data";

type Summary = {
  stats: {
    reportsToday: { submitted: number; total: number };
    pendingLeaves: number;
    inProgressTasks: number;
    blockers: number;
  };
  projectProgress: {
    id: string;
    name: string;
    done: number;
    total: number;
    percent: number;
  }[];
  recentActivity: ApiActivity[];
  upcomingLeaves: ApiLeave[];
};

const ACTION_DOT: Record<string, string> = {
  "task.status": "#7c3aed",
  "task.create": "#3b82f6",
  "report.create": "#0d9488",
  "report.blocker": "#e11d48",
  "leave.create": "#f59e0b",
  "leave.approve": "#10b981",
  "leave.reject": "#e11d48",
  "task.comment": "#a1a1aa",
  "user.create": "#3b82f6",
};

function relTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.round(h / 24);
  return d === 1 ? "เมื่อวาน" : `${d} วันที่แล้ว`;
}

export default function DashboardPage() {
  const { reports } = useData();
  const me = useCurrentUser();
  const firstName = (me?.name ?? CURRENT_USER.name).split(" ")[0];

  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const s = summary?.stats;
  const stats = [
    {
      label: "รายงานวันนี้",
      value: s ? `${s.reportsToday.submitted}/${s.reportsToday.total}` : "—",
      sub: "ส่งแล้ววันนี้",
      dot: "#0d9488",
    },
    {
      label: "คำขอลารออนุมัติ",
      value: s ? String(s.pendingLeaves) : "—",
      sub: "รอการอนุมัติ",
      dot: "#f59e0b",
    },
    {
      label: "งานกำลังทำ",
      value: s ? String(s.inProgressTasks) : "—",
      sub: "กำลังดำเนินการ",
      dot: "#3b82f6",
    },
    {
      label: "อุปสรรค",
      value: s ? String(s.blockers) : "—",
      sub: "ต้องการความช่วยเหลือ",
      dot: "#e11d48",
    },
  ];

  const activityItems = (summary?.recentActivity ?? []).map((a) => ({
    who: a.user.name,
    what: a.message.startsWith(a.user.name)
      ? a.message.slice(a.user.name.length).trim()
      : a.message,
    time: relTime(a.createdAt),
    dot: ACTION_DOT[a.action] ?? "#a1a1aa",
  }));

  return (
    <div className="flex flex-col gap-5 px-7 py-6">
      {/* Greeting */}
      <div>
        <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
          DASHBOARD · THU 9 JUL
        </div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[19px] font-bold tracking-[-0.02em]">
            สวัสดีตอนเช้า คุณ{firstName}
          </h1>
          {s && (
            <span className="text-[13px] text-zinc-500">
              ส่งรายงานแล้ว {s.reportsToday.submitted} จาก {s.reportsToday.total} คน
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((st) => (
          <StatCard key={st.label} {...st} />
        ))}
      </div>

      {/* Blocker banner */}
      {!!s?.blockers && (
        <div className="flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-[11px]">
          <TriangleAlert className="size-4 flex-none text-amber-700" strokeWidth={2} />
          <span className="flex-1 text-[13px] text-amber-900">
            <strong>วันนี้มีอุปสรรค {s.blockers} รายการ</strong> —
            มีสมาชิกที่ต้องการความช่วยเหลือ ตรวจสอบได้ในหน้ารายงาน
          </span>
          <Link
            href="/reports"
            className="rounded-[7px] border border-amber-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            ดูรายงาน
          </Link>
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Recent report status */}
          <Card>
            <CardHeader>
              <CardTitle>สถานะรายงานล่าสุด</CardTitle>
              <Link
                href="/reports"
                className="text-[12.5px] font-medium text-teal-600 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </CardHeader>
            {reports.slice(0, 7).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
              >
                <Avatar userKey={r.key} size={28} fontSize={10.5} />
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium">{r.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{r.proj}</span>
                </div>
                <span className="text-xs text-zinc-400">{r.date}</span>
                <StatusBadge label={r.status} />
              </div>
            ))}
            {reports.length === 0 && (
              <div className="px-[18px] py-6 text-center text-[12.5px] text-zinc-400">
                ยังไม่มีรายงาน
              </div>
            )}
          </Card>

          {/* Task progress by project */}
          <Card>
            <CardHeader>
              <CardTitle>ความคืบหน้างานตามโปรเจกต์</CardTitle>
              <Link
                href="/tasks"
                className="text-[12.5px] font-medium text-teal-600 hover:underline"
              >
                เปิดบอร์ดงาน
              </Link>
            </CardHeader>
            <div className="flex flex-col gap-3.5 px-[18px] py-3.5 pb-4">
              {(summary?.projectProgress ?? []).map((p) => (
                <div key={p.id}>
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-zinc-500">
                      {p.done}/{p.total} งาน · {p.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Team activity */}
          <Card>
            <div className="border-b border-hairline px-[18px] py-3.5 text-[13.5px] font-semibold">
              กิจกรรมของทีม
            </div>
            <ActivityFeed items={activityItems} />
          </Card>

          {/* Upcoming leave */}
          <Card>
            <CardHeader>
              <CardTitle>การลาที่กำลังจะถึง</CardTitle>
              <Link
                href="/leaves"
                className="text-[12.5px] font-medium text-teal-600 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </CardHeader>
            {(summary?.upcomingLeaves ?? []).slice(0, 4).map((l) => {
              const typeTh = LEAVE_TYPE_TO_TH[l.type];
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-[11px] border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <Avatar userKey={l.user.avatarKey} size={26} fontSize={10} />
                  <div className="flex-1">
                    <div className="text-[12.5px] font-medium">{l.user.name}</div>
                    <div className="text-[11.5px] text-zinc-400">
                      {formatThaiRange(l.startDate, l.endDate)}
                      {l.status === "PENDING" ? " · รออนุมัติ" : ""}
                    </div>
                  </div>
                  <StatusBadge label={typeTh} colors={LEAVE_TYPE_COLORS[typeTh]} />
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
