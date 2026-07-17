"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/lib/store";
import { api } from "@/lib/api";

type TrendResp = {
  days: number;
  required: number;
  series: { date: string; submitted: number }[];
};

export default function AnalyticsPage() {
  const { tasks, leaves } = useData();
  const [trend, setTrend] = useState<TrendResp | null>(null);
  const [trendErr, setTrendErr] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<TrendResp>("/api/dashboard/report-trend?days=14")
      .then((r) => alive && setTrend(r))
      .catch(() => alive && setTrendErr(true));
    return () => {
      alive = false;
    };
  }, []);

  const statusCounts = useMemo(() => {
    const order = ["Todo", "In Progress", "Review", "Done"];
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.status, (m.get(t.status) ?? 0) + 1);
    return order.map((label) => ({ label, value: m.get(label) ?? 0 }));
  }, [tasks]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const donePct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const workload = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "Done") continue;
      for (const a of t.assignees) m.set(a.name, (m.get(a.name) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tasks]);

  const pendingLeaves = leaves.filter((l) => l.status === "รออนุมัติ").length;

  const avgDaily =
    trend && trend.series.length
      ? Math.round(
          (trend.series.reduce((s, d) => s + d.submitted, 0) / trend.series.length) * 10
        ) / 10
      : 0;

  const maxTrend = trend
    ? Math.max(trend.required, ...trend.series.map((d) => d.submitted), 1)
    : 1;
  const maxStatus = Math.max(...statusCounts.map((s) => s.value), 1);
  const maxWorkload = Math.max(...workload.map((w) => w.value), 1);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="TEAM ANALYTICS"
        title="วิเคราะห์ทีม"
        description="ภาพรวมการส่งรายงานและปริมาณงานของทีม"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="งานทั้งหมด" value={totalTasks} />
        <Kpi label="เสร็จแล้ว" value={`${donePct}%`} sub={`${doneTasks}/${totalTasks}`} />
        <Kpi
          label="ส่งรายงานเฉลี่ย/วัน"
          value={avgDaily}
          sub={trend ? `จากที่ต้องส่ง ${trend.required} คน` : "—"}
        />
        <Kpi label="คำขอลารออนุมัติ" value={pendingLeaves} />
      </div>

      <Card title="แนวโน้มการส่งรายงาน (14 วันล่าสุด)">
        {trendErr ? (
          <Empty text="โหลดข้อมูลแนวโน้มไม่สำเร็จ" />
        ) : !trend ? (
          <Empty text="กำลังโหลด…" />
        ) : (
          <div>
            <div className="flex h-40 items-end gap-1.5">
              {trend.series.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${d.date} · ส่ง ${d.submitted}/${trend.required}`}
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-teal-500/85"
                      style={{ height: `${(d.submitted / maxTrend) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums text-muted-foreground">
                    {d.date.slice(8)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11.5px] text-muted-foreground">
              เป้าหมาย {trend.required} คนที่ต้องส่งต่อวัน · เฉลี่ยจริง {avgDaily}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="สถานะงาน">
          <div className="flex flex-col gap-2.5">
            {statusCounts.map((s) => (
              <HBar key={s.label} label={s.label} value={s.value} pct={(s.value / maxStatus) * 100} />
            ))}
          </div>
        </Card>
        <Card title="งานที่ยังไม่เสร็จ (ต่อคน)">
          {workload.length === 0 ? (
            <Empty text="ไม่มีงานค้างของทีม" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {workload.map((w) => (
                <HBar key={w.name} label={w.name} value={w.value} pct={(w.value / maxWorkload) * 100} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-[13px] font-semibold">{title}</div>
      {children}
    </div>
  );
}

function HBar({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 flex-none truncate text-[12.5px] text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${value > 0 ? Math.max(pct, 5) : 0}%` }}
        />
      </div>
      <span className="w-8 flex-none text-right text-[12.5px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-[12.5px] text-muted-foreground">{text}</div>;
}
