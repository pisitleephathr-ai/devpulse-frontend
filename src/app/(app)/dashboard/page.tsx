"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { ActivityFeed } from "@/components/activity-feed";
import { useData } from "@/lib/store";
import {
  CURRENT_USER,
  DASHBOARD_STATS,
  REPORT_STATUS,
  PROJECT_PROGRESS,
  TEAM_ACTIVITY,
  LEAVE_TYPE_COLORS,
  upcomingLeave,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const { leaves: allLeaves, tasks, pendingLeaveCount } = useData();
  const leaves = upcomingLeave(allLeaves);
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;

  // Derive the live counts; keep the rest of the seed copy as-is.
  const stats = DASHBOARD_STATS.map((s) => {
    if (s.label === "คำขอลารออนุมัติ")
      return { ...s, value: String(pendingLeaveCount) };
    if (s.label === "งานกำลังทำ") return { ...s, value: String(inProgress) };
    return s;
  });

  return (
    <div className="flex flex-col gap-5 px-7 py-6">
      {/* Greeting */}
      <div>
        <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
          DASHBOARD · THU 9 JUL
        </div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[19px] font-bold tracking-[-0.02em]">
            สวัสดีตอนเช้า คุณ{CURRENT_USER.first}
          </h1>
          <span className="text-[13px] text-zinc-500">
            ส่งรายงานแล้ว 5 จาก 7 คน
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Blocker banner */}
      <div className="flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-[11px]">
        <TriangleAlert
          className="size-4 flex-none text-amber-700"
          strokeWidth={2}
        />
        <span className="flex-1 text-[13px] text-amber-900">
          <strong>วันนี้มีอุปสรรค 2 รายการ</strong> —
          โจนาสติดเรื่องสิทธิ์เข้าถึงฐานข้อมูล Staging; ทอมรอใบรับรอง Push
          Notification
        </span>
        <Link
          href="/reports"
          className="rounded-[7px] border border-amber-300 px-2.5 py-[5px] text-[12.5px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        >
          ดูรายงาน
        </Link>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Today's report status */}
          <Card>
            <CardHeader>
              <CardTitle>สถานะรายงานวันนี้</CardTitle>
              <Link
                href="/reports"
                className="text-[12.5px] font-medium text-teal-600 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </CardHeader>
            {REPORT_STATUS.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
              >
                <Avatar userKey={r.key} size={28} fontSize={10.5} />
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium">{r.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{r.proj}</span>
                </div>
                <span className="text-xs text-zinc-400">{r.time}</span>
                <StatusBadge label={r.status} />
              </div>
            ))}
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
              {PROJECT_PROGRESS.map((p) => {
                const pct = Math.round((p.done / p.total) * 100);
                return (
                  <div key={p.name}>
                    <div className="mb-1.5 flex justify-between text-[12.5px]">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-zinc-500">
                        {p.done}/{p.total} งาน · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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
            <ActivityFeed items={TEAM_ACTIVITY} />
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
            {leaves.map((l, i) => (
              <div
                key={i}
                className="flex items-center gap-[11px] border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
              >
                <Avatar userKey={l.key} size={26} fontSize={10} />
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium">{l.name}</div>
                  <div className="text-[11.5px] text-zinc-400">
                    {l.displayDates}
                  </div>
                </div>
                <StatusBadge
                  label={l.type}
                  colors={LEAVE_TYPE_COLORS[l.type]}
                />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
