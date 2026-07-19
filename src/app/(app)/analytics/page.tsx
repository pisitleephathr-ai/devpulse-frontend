"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/lib/store";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { bangkokDateISO, thaiDateShortFromISO } from "@/lib/thai-datetime";
import {
  TrendingUp,
  TriangleAlert,
  Clock,
  CheckCircle2,
  Timer,
  Gauge,
  Layers,
  FolderKanban,
  Users,
  FileText,
  CalendarOff,
  Flame,
  ArrowDownRight,
  Repeat,
} from "lucide-react";

/* ------------------------------- API types ------------------------------ */

type ApiUserMini = { id: string; name: string; avatarKey: string };
type Proj = { name: string; code: string; color: string };

type Insights = {
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    readyToTest: number;
    done: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    completionRate: number;
  };
  reports: {
    date: string;
    isWorkingDay?: boolean;
    holiday?: { name: string; type: string } | null;
    submittedCount: number;
    totalMembers: number;
    submitted: ApiUserMini[];
    missing: ApiUserMini[];
    onLeave?: ApiUserMini[];
  };
  topBlockers: { id: string; text: string; author: ApiUserMini; project: Proj; date: string }[];
  workload: {
    id: string;
    name: string;
    avatarKey: string;
    onLeave?: boolean;
    todo: number;
    inProgress: number;
    review: number;
    readyToTest?: number;
    done: number;
    open: number;
    total: number;
    closed?: number;
    onTimeClosed?: number;
    lateClosed?: number;
    onTimeRate?: number | null;
  }[];
  recentlyCompleted: {
    id: string;
    title: string;
    assignee: ApiUserMini | null;
    project: Proj;
    updatedAt: string;
  }[];
};

type TrendResp = {
  days: number;
  required: number;
  series: { date: string; submitted: number }[];
};

type VelocityResp = {
  weeks: number;
  cycleTime: { avgDays: number | null; medianDays: number | null; count: number };
  velocity: {
    series: { weekStart: string; completed: number }[];
    avgPerWeek: number;
    total: number;
  };
};

/* --------------------------- validated palette --------------------------- */
// Data-mark colors validated with the dataviz palette validator.
// Brand accent (single-series magnitude): teal — visible on both surfaces.
const TEAL = "#0d9488";
const TEAL_SOFT = "#14b8a6";
// Status palette (fixed, icon+label paired): good / warning / serious / critical.
const C_GOOD = "#0ca30c";
const C_WARN = "#fab219";
const C_CRIT = "#d03b3b";
const C_MUTED = "#a1a1aa";
// Blue ordinal ramp (pipeline stages, TODO→Done). Theme-aware light/dark steps
// applied via CSS custom properties on the wrapper (see STAGE_VARS).
const STAGE_KEYS = ["--st1", "--st2", "--st3", "--st4", "--st5"] as const;
// Tailwind arbitrary-property classes so the ordinal ramp re-steps for dark mode.
const STAGE_VARS =
  "[--st1:#86b6ef] [--st2:#5598e7] [--st3:#2a78d6] [--st4:#1c5cab] [--st5:#104281] " +
  "dark:[--st1:#9ec5f4] dark:[--st2:#6da7ec] dark:[--st3:#3987e5] dark:[--st4:#256abf] dark:[--st5:#184f95]";

/* ================================= Page ================================= */

export default function AnalyticsPage() {
  const { tasks, projects } = useData();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsErr, setInsightsErr] = useState(false);
  const [period, setPeriod] = useState<7 | 14 | 30>(14);
  const [trend, setTrend] = useState<TrendResp | null>(null);
  const [trendErr, setTrendErr] = useState(false);
  const [vel, setVel] = useState<VelocityResp | null>(null);
  const [velErr, setVelErr] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<Insights>("/api/dashboard/insights")
      .then((r) => alive && setInsights(r))
      .catch(() => alive && setInsightsErr(true));
    api
      .get<VelocityResp>("/api/dashboard/velocity?weeks=8")
      .then((r) => alive && setVel(r))
      .catch(() => alive && setVelErr(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get<TrendResp>(`/api/dashboard/report-trend?days=${period}`)
      .then((r) => {
        if (alive) {
          setTrend(r);
          setTrendErr(false);
        }
      })
      .catch(() => alive && setTrendErr(true));
    return () => {
      alive = false;
    };
  }, [period]);

  // The trend isn't nulled on period change (that would be a synchronous
  // setState in an effect); instead we treat it as loading until the response
  // for the currently-selected period arrives.
  const trendReady = !!trend && trend.days === period;

  const t = insights?.tasks;
  const rep = insights?.reports;
  const wl = insights?.workload ?? [];

  /* team delivery quality — on-time vs late across all closed tasks with a due date */
  const closedSum = wl.reduce((s, w) => s + (w.closed ?? 0), 0);
  const onTimeSum = wl.reduce((s, w) => s + (w.onTimeClosed ?? 0), 0);
  const lateSum = Math.max(0, closedSum - onTimeSum);
  const teamOnTime = closedSum ? Math.round((onTimeSum / closedSum) * 100) : null;

  /* report compliance for the reference day */
  const repTotal = rep?.totalMembers ?? 0;
  const repDone = rep?.submittedCount ?? 0;
  const repPct = repTotal ? Math.round((repDone / repTotal) * 100) : 0;
  const isHoliday = rep && rep.isWorkingDay === false;

  /* pipeline stages */
  const stages = t
    ? [
        { label: "รอดำเนินการ", value: t.todo },
        { label: "กำลังทำ", value: t.inProgress },
        { label: "รอตรวจ", value: t.review },
        { label: "พร้อมทดสอบ", value: t.readyToTest },
        { label: "เสร็จแล้ว", value: t.done },
      ]
    : [];
  const wip = t ? t.inProgress + t.review + t.readyToTest : 0;

  /* priority mix of OPEN tasks (client store) */
  const priorityMix = useMemo(() => {
    const m = { High: 0, Medium: 0, Low: 0 } as Record<string, number>;
    for (const task of tasks) {
      if (task.status === "Done") continue;
      if (task.pri in m) m[task.pri] += 1;
    }
    return m;
  }, [tasks]);
  const openTotal = priorityMix.High + priorityMix.Medium + priorityMix.Low;

  /* per-project breakdown (client store): progress + open + overdue */
  const projectRows = useMemo(() => {
    const todayIso = bangkokDateISO();
    const byCode = new Map<
      string,
      { total: number; done: number; open: number; overdue: number }
    >();
    for (const task of tasks) {
      const acc =
        byCode.get(task.proj) ?? { total: 0, done: 0, open: 0, overdue: 0 };
      acc.total += 1;
      if (task.status === "Done") acc.done += 1;
      else {
        acc.open += 1;
        if (task.dueISO && task.dueISO < todayIso) acc.overdue += 1;
      }
      byCode.set(task.proj, acc);
    }
    const colorByCode = new Map(projects.map((p) => [p.code, p]));
    return [...byCode.entries()]
      .map(([code, c]) => {
        const p = colorByCode.get(code);
        return {
          code,
          name: p?.name ?? code,
          color: p?.color ?? TEAL,
          ...c,
          percent: c.total ? Math.round((c.done / c.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.open - a.open || b.total - a.total)
      .slice(0, 8);
  }, [tasks, projects]);

  /* per-person report status (today) for the team table */
  const reportStatusById = useMemo(() => {
    const m = new Map<string, "submitted" | "missing" | "leave">();
    rep?.submitted.forEach((u) => m.set(u.id, "submitted"));
    rep?.missing.forEach((u) => m.set(u.id, "missing"));
    rep?.onLeave?.forEach((u) => m.set(u.id, "leave"));
    return m;
  }, [rep]);

  /* executive health assessment */
  const health = useMemo(() => {
    if (!t || !rep) return null;
    const risks: string[] = [];
    if (t.overdue > 0) risks.push(`${t.overdue} งานเลยกำหนด`);
    if (teamOnTime !== null && teamOnTime < 70)
      risks.push(`ส่งงานตรงเวลาเพียง ${teamOnTime}%`);
    if (!isHoliday && repTotal > 0 && repPct < 80)
      risks.push(`รายงานวันนี้ ${repDone}/${repTotal}`);
    if ((insights?.topBlockers.length ?? 0) >= 3)
      risks.push(`${insights?.topBlockers.length} อุปสรรคค้างอยู่`);
    const level = risks.length >= 3 ? "risk" : risks.length >= 1 ? "watch" : "good";
    return { level, risks } as const;
  }, [t, rep, teamOnTime, isHoliday, repTotal, repPct, repDone, insights]);

  const loading = !insights && !insightsErr;

  return (
    <div className={`flex flex-col gap-4 px-7 py-6 ${STAGE_VARS}`}>
      <PageHeader
        eyebrow="EXECUTIVE ANALYTICS"
        title="วิเคราะห์เชิงลึกทีม"
        description="ตัวชี้วัดสุขภาพทีม การส่งมอบงาน และความเสี่ยง สำหรับผู้บริหาร"
        actions={
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: 7, label: "7 วัน" },
              { value: 14, label: "14 วัน" },
              { value: 30, label: "30 วัน" },
            ]}
          />
        }
      />

      {insightsErr && (
        <Banner>โหลดข้อมูลวิเคราะห์ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</Banner>
      )}

      {/* Executive summary */}
      {health && (
        <ExecutiveSummary
          level={health.level}
          risks={health.risks}
          completion={t!.completionRate}
          onTime={teamOnTime}
          overdue={t!.overdue}
        />
      )}

      {/* Hero KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<Gauge className="size-[18px]" />}
          label="อัตรางานเสร็จ"
          value={t ? `${t.completionRate}%` : "—"}
          sub={t ? `${t.done}/${t.total} งาน` : undefined}
          ring={t?.completionRate ?? 0}
          ringColor={TEAL}
          loading={loading}
        />
        <KpiTile
          icon={<Timer className="size-[18px]" />}
          label="ส่งงานตรงเวลา"
          value={teamOnTime !== null ? `${teamOnTime}%` : "—"}
          sub={closedSum ? `${onTimeSum}/${closedSum} งานที่ปิด` : "ยังไม่มีงานปิด"}
          ring={teamOnTime ?? 0}
          ringColor={
            teamOnTime === null ? C_MUTED : teamOnTime >= 80 ? C_GOOD : teamOnTime >= 60 ? C_WARN : C_CRIT
          }
          loading={loading}
        />
        <KpiTile
          icon={isHoliday ? <CalendarOff className="size-[18px]" /> : <FileText className="size-[18px]" />}
          label="รายงานวันนี้"
          value={isHoliday ? "วันหยุด" : `${repDone}/${repTotal}`}
          sub={isHoliday ? rep?.holiday?.name ?? "ไม่ต้องส่งรายงาน" : `ส่งแล้ว ${repPct}%`}
          ring={isHoliday ? 100 : repPct}
          ringColor={isHoliday ? C_MUTED : repPct >= 80 ? C_GOOD : repPct >= 50 ? C_WARN : C_CRIT}
          loading={loading}
        />
        <KpiTile
          icon={<TriangleAlert className="size-[18px]" />}
          label="งานเลยกำหนด"
          value={t ? `${t.overdue}` : "—"}
          sub={t ? `ครบวันนี้ ${t.dueToday} · สัปดาห์นี้ ${t.dueThisWeek}` : undefined}
          accent={t && t.overdue > 0 ? C_CRIT : C_GOOD}
          loading={loading}
        />
      </div>

      {/* Trend + delivery quality */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="แนวโน้มการส่งรายงาน"
          subtitle={`${period} วันล่าสุด`}
          icon={<TrendingUp className="size-4" />}
        >
          {trendErr && !trendReady ? (
            <Empty text="โหลดข้อมูลแนวโน้มไม่สำเร็จ" />
          ) : !trendReady ? (
            <div className="h-52 animate-pulse rounded-lg bg-muted" />
          ) : (
            <TrendChart trend={trend!} />
          )}
        </Panel>

        <Panel title="คุณภาพการส่งมอบ" subtitle="ตรงเวลา vs ล่าช้า" icon={<CheckCircle2 className="size-4" />}>
          {loading ? (
            <div className="h-52 animate-pulse rounded-lg bg-muted" />
          ) : closedSum === 0 ? (
            <Empty text="ยังไม่มีงานที่ปิดพร้อมกำหนดส่ง" />
          ) : (
            <DeliveryDonut onTime={onTimeSum} late={lateSum} rate={teamOnTime ?? 0} />
          )}
        </Panel>
      </div>

      {/* Velocity + cycle time */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="ความเร็วการส่งมอบ (Velocity)"
          subtitle={vel ? `เฉลี่ย ${vel.velocity.avgPerWeek} งาน/สัปดาห์ · ${vel.weeks} สัปดาห์` : "งานที่เสร็จต่อสัปดาห์"}
          icon={<Repeat className="size-4" />}
        >
          {velErr ? (
            <Empty text="โหลดข้อมูล velocity ไม่สำเร็จ" />
          ) : !vel ? (
            <div className="h-44 animate-pulse rounded-lg bg-muted" />
          ) : (
            <VelocityChart data={vel} />
          )}
        </Panel>

        <Panel title="Cycle Time เฉลี่ย" subtitle="ตั้งแต่เริ่มทำจนเสร็จ" icon={<Timer className="size-4" />}>
          {velErr ? (
            <Empty text="โหลดข้อมูลไม่สำเร็จ" />
          ) : !vel ? (
            <div className="h-44 animate-pulse rounded-lg bg-muted" />
          ) : (
            <CycleTime cycle={vel.cycleTime} />
          )}
        </Panel>
      </div>

      {/* Pipeline + priority */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="สายพานงาน (Pipeline)"
          subtitle={t ? `กำลังทำอยู่ ${wip} งาน · ทั้งหมด ${t.total}` : undefined}
          icon={<Layers className="size-4" />}
        >
          {loading ? (
            <div className="h-28 animate-pulse rounded-lg bg-muted" />
          ) : (
            <Pipeline stages={stages} />
          )}
        </Panel>

        <Panel title="งานค้างตามความสำคัญ" subtitle={`ค้างทั้งหมด ${openTotal} งาน`} icon={<Flame className="size-4" />}>
          {openTotal === 0 ? (
            <Empty text="ไม่มีงานค้าง 🎉" />
          ) : (
            <PriorityMix mix={priorityMix} total={openTotal} />
          )}
        </Panel>
      </div>

      {/* Projects + team performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="สุขภาพโปรเจกต์" subtitle="ความคืบหน้า · งานค้าง · เลยกำหนด" icon={<FolderKanban className="size-4" />}>
          {projectRows.length === 0 ? (
            <Empty text="ยังไม่มีข้อมูลโปรเจกต์" />
          ) : (
            <div className="flex flex-col divide-y divide-hairline">
              {projectRows.map((p) => (
                <ProjectRow key={p.code} p={p} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="ผลงานรายบุคคล" subtitle="ภาระงาน · ตรงเวลา · รายงาน" icon={<Users className="size-4" />}>
          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          ) : wl.length === 0 ? (
            <Empty text="ไม่มีข้อมูลทีม" />
          ) : (
            <TeamTable rows={wl} reportStatusById={reportStatusById} />
          )}
        </Panel>
      </div>

      {/* Blockers + recently completed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="อุปสรรคที่ต้องช่วยแก้"
          subtitle={insights ? `${insights.topBlockers.length} รายการ` : undefined}
          icon={<TriangleAlert className="size-4" />}
        >
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : (insights?.topBlockers.length ?? 0) === 0 ? (
            <Empty text="ไม่มีอุปสรรคค้างอยู่ 🎉" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {insights!.topBlockers.map((b) => (
                <BlockerRow key={b.id} b={b} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="งานที่เพิ่งเสร็จ" subtitle="ล่าสุด" icon={<CheckCircle2 className="size-4" />}>
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : (insights?.recentlyCompleted.length ?? 0) === 0 ? (
            <Empty text="ยังไม่มีงานที่ปิดล่าสุด" />
          ) : (
            <div className="flex flex-col gap-2">
              {insights!.recentlyCompleted.map((c) => (
                <CompletedRow key={c.id} c={c} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================ Executive summary =========================== */

function ExecutiveSummary({
  level,
  risks,
  completion,
  onTime,
  overdue,
}: {
  level: "good" | "watch" | "risk";
  risks: string[];
  completion: number;
  onTime: number | null;
  overdue: number;
}) {
  const meta = {
    good: { label: "สุขภาพดี", color: C_GOOD, ring: "ring-emerald-200 dark:ring-emerald-900/50", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
    watch: { label: "ต้องเฝ้าระวัง", color: C_WARN, ring: "ring-amber-200 dark:ring-amber-900/50", chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    risk: { label: "มีความเสี่ยง", color: C_CRIT, ring: "ring-red-200 dark:ring-red-900/50", chip: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  }[level];

  const sentence =
    level === "good"
      ? "ทีมอยู่ในเกณฑ์ดี ไม่มีสัญญาณความเสี่ยงที่ต้องรีบจัดการ"
      : `ต้องให้ความสนใจ: ${risks.join(" · ")}`;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 ring-1 ${meta.ring} sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-10 flex-none items-center justify-center rounded-xl"
          style={{ background: `${meta.color}1a`, color: meta.color }}
        >
          <Gauge className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="text-[12px] text-muted-foreground">ภาพรวมวันนี้</span>
          </div>
          <p className="mt-1 text-[13.5px] font-medium leading-snug text-zinc-700 dark:text-zinc-200 [overflow-wrap:anywhere]">
            {sentence}
          </p>
        </div>
      </div>
      <div className="flex flex-none items-center gap-5 sm:pr-1">
        <MiniStat label="งานเสร็จ" value={`${completion}%`} />
        <MiniStat label="ตรงเวลา" value={onTime !== null ? `${onTime}%` : "—"} />
        <MiniStat label="เลยกำหนด" value={`${overdue}`} danger={overdue > 0} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="text-right">
      <div className={`text-[19px] font-bold leading-none tabular-nums ${danger ? "text-red-600 dark:text-red-400" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

/* ================================ KPI tile ============================== */

function KpiTile({
  icon,
  label,
  value,
  sub,
  ring,
  ringColor,
  accent,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  ring?: number;
  ringColor?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5">
      {ring !== undefined && ringColor ? (
        <ProgressRing value={ring} color={ringColor} size={46}>
          <span style={{ color: ringColor }}>{icon}</span>
        </ProgressRing>
      ) : (
        <span
          className="flex size-11 flex-none items-center justify-center rounded-xl"
          style={{ background: `${accent ?? TEAL}1a`, color: accent ?? TEAL }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[11.5px] text-muted-foreground">{label}</div>
        {loading ? (
          <div className="mt-1 h-6 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-[22px] font-bold leading-tight tabular-nums">{value}</div>
        )}
        {sub && !loading && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function ProgressRing({
  value,
  color,
  size,
  children,
}: {
  value: number;
  color: string;
  size: number;
  children: React.ReactNode;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </div>
  );
}

/* ============================== Trend chart ============================= */

function TrendChart({ trend }: { trend: TrendResp }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 220;
  const PADX = 10;
  const PADT = 16;
  const PADB = 26;
  const n = trend.series.length;
  const maxY = Math.max(trend.required, ...trend.series.map((d) => d.submitted), 1);
  const plotH = H - PADT - PADB;

  const xFor = (i: number) => PADX + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * PADX));
  const yFor = (v: number) => PADT + (1 - v / maxY) * plotH;
  const baseY = yFor(0);

  const linePts = trend.series.map((d, i) => `${xFor(i)},${yFor(d.submitted)}`);
  const areaPath = `M ${xFor(0)},${baseY} L ${linePts.join(" L ")} L ${xFor(n - 1)},${baseY} Z`;
  const linePath = `M ${linePts.join(" L ")}`;
  const reqY = yFor(trend.required);

  const avg =
    n > 0
      ? Math.round((trend.series.reduce((s, d) => s + d.submitted, 0) / n) * 10) / 10
      : 0;

  const labelEvery = Math.max(1, Math.ceil(n / 8));

  function onMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    setHover(idx);
  }

  const hoverPt = hover !== null ? trend.series[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px]">
        <LegendDot color={TEAL} label="ส่งแล้ว/วัน" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: C_MUTED }} />
          เป้าหมาย {trend.required} คน
        </span>
        <span className="text-muted-foreground">เฉลี่ยจริง <b className="text-zinc-700 dark:text-zinc-200">{avg}</b> คน/วัน</span>
      </div>

      <div
        ref={wrapRef}
        className="relative"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block overflow-visible">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={TEAL_SOFT} stopOpacity="0.28" />
              <stop offset="1" stopColor={TEAL_SOFT} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* required baseline */}
          <line x1={PADX} y1={reqY} x2={W - PADX} y2={reqY} stroke={C_MUTED} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7" />

          <path d={areaPath} fill="url(#trendFill)" />
          <path d={linePath} fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* hover crosshair + point */}
          {hover !== null && hoverPt && (
            <g>
              <line x1={xFor(hover)} y1={PADT} x2={xFor(hover)} y2={baseY} stroke={C_MUTED} strokeWidth="1" opacity="0.5" />
              <circle cx={xFor(hover)} cy={yFor(hoverPt.submitted)} r="5" fill={TEAL} stroke="var(--card)" strokeWidth="2.5" />
            </g>
          )}

          {/* x labels */}
          {trend.series.map((d, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={d.date} x={xFor(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {d.date.slice(8)}
              </text>
            ) : null
          )}
        </svg>

        {/* tooltip */}
        {hover !== null && hoverPt && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] shadow-lg"
            style={{ left: `${(xFor(hover) / W) * 100}%`, top: `${(yFor(hoverPt.submitted) / H) * 100}%` }}
          >
            <div className="font-semibold tabular-nums">{hoverPt.date}</div>
            <div className="text-muted-foreground">
              ส่งแล้ว <b className="text-teal-600 dark:text-teal-400">{hoverPt.submitted}</b>/{trend.required}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ Delivery donut ============================ */

function DeliveryDonut({ onTime, late, rate }: { onTime: number; late: number; rate: number }) {
  const total = onTime + late || 1;
  const size = 168;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const onTimeLen = (onTime / total) * c;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C_CRIT} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={C_GOOD}
            strokeWidth={stroke}
            strokeDasharray={`${onTimeLen} ${c - onTimeLen}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-bold leading-none tabular-nums">{rate}%</span>
          <span className="mt-1 text-[11px] text-muted-foreground">ตรงเวลา</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <DonutLegend color={C_GOOD} icon={<CheckCircle2 className="size-3.5" />} label="ตรงเวลา" value={onTime} />
        <DonutLegend color={C_CRIT} icon={<Clock className="size-3.5" />} label="ล่าช้า" value={late} />
      </div>
    </div>
  );
}

function DonutLegend({ color, icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-hairline bg-muted/30 px-2.5 py-1.5">
      <span style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[15px] font-bold leading-none tabular-nums">{value}</div>
        <div className="text-[10.5px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ============================ Velocity chart =========================== */

function VelocityChart({ data }: { data: VelocityResp }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const s = data.velocity.series;
  const n = s.length;

  const W = 720;
  const H = 200;
  const PADX = 10;
  const PADT = 14;
  const PADB = 26;
  const plotH = H - PADT - PADB;
  const maxY = Math.max(...s.map((d) => d.completed), 1);
  const slot = (W - 2 * PADX) / n;
  const barW = Math.min(46, slot * 0.62);
  const xMid = (i: number) => PADX + slot * i + slot / 2;
  const yFor = (v: number) => PADT + (1 - v / maxY) * plotH;
  const baseY = yFor(0);
  const avgY = yFor(data.velocity.avgPerWeek);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  function onMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(ratio * n)));
    setHover(idx);
  }

  const hoverPt = hover !== null ? s[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px]">
        <LegendDot color={TEAL} label="งานเสร็จ/สัปดาห์" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: C_MUTED }} />
          เฉลี่ย {data.velocity.avgPerWeek}
        </span>
        <span className="text-muted-foreground">รวม <b className="text-zinc-700 dark:text-zinc-200">{data.velocity.total}</b> งาน</span>
      </div>

      <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block overflow-visible">
          {/* avg line */}
          <line x1={PADX} y1={avgY} x2={W - PADX} y2={avgY} stroke={C_MUTED} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7" />
          {s.map((d, i) => {
            const h = d.completed > 0 ? Math.max(2, baseY - yFor(d.completed)) : 0;
            return (
              <g key={d.weekStart}>
                {h > 0 && (
                  <rect
                    x={xMid(i) - barW / 2}
                    y={yFor(d.completed)}
                    width={barW}
                    height={h}
                    rx="4"
                    fill={TEAL}
                    opacity={hover === null || hover === i ? 1 : 0.5}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={xMid(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                    {thaiDateShortFromISO(d.weekStart)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover !== null && hoverPt && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] shadow-lg"
            style={{ left: `${(xMid(hover) / W) * 100}%`, top: `${(yFor(hoverPt.completed) / H) * 100}%` }}
          >
            <div className="font-semibold">สัปดาห์ {thaiDateShortFromISO(hoverPt.weekStart)}</div>
            <div className="text-muted-foreground">
              เสร็จ <b className="text-teal-600 dark:text-teal-400">{hoverPt.completed}</b> งาน
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== Cycle time ============================= */

function CycleTime({ cycle }: { cycle: VelocityResp["cycleTime"] }) {
  if (cycle.avgDays === null)
    return <Empty text="ยังไม่มีงานที่ปิดในช่วงนี้" />;
  return (
    <div className="flex h-full flex-col justify-center gap-4 py-2">
      <div className="text-center">
        <div className="flex items-end justify-center gap-1.5">
          <span className="text-[44px] font-bold leading-none tabular-nums">{cycle.avgDays}</span>
          <span className="pb-1.5 text-[15px] font-medium text-muted-foreground">วัน</span>
        </div>
        <div className="mt-1.5 text-[11.5px] text-muted-foreground">เฉลี่ยจากเริ่มทำจนเสร็จ</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-hairline bg-muted/30 px-3 py-2 text-center">
          <div className="text-[17px] font-bold tabular-nums">{cycle.medianDays ?? "—"}</div>
          <div className="text-[10.5px] text-muted-foreground">มัธยฐาน (วัน)</div>
        </div>
        <div className="rounded-lg border border-hairline bg-muted/30 px-3 py-2 text-center">
          <div className="text-[17px] font-bold tabular-nums">{cycle.count}</div>
          <div className="text-[10.5px] text-muted-foreground">งานที่ปิด</div>
        </div>
      </div>
    </div>
  );
}

/* =============================== Pipeline =============================== */

function Pipeline({ stages }: { stages: { label: string; value: number }[] }) {
  const total = stages.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      {/* composition bar */}
      <div className="flex h-8 w-full gap-[3px] overflow-hidden rounded-lg">
        {stages.map((s, i) =>
          s.value > 0 ? (
            <div
              key={s.label}
              className="h-full first:rounded-l-lg last:rounded-r-lg"
              style={{ width: `${(s.value / total) * 100}%`, background: `var(${STAGE_KEYS[i]})`, minWidth: 3 }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null
        )}
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 flex-none rounded-[3px]" style={{ background: `var(${STAGE_KEYS[i]})` }} />
            <span className="flex-1 truncate text-[12px] text-zinc-600 dark:text-zinc-300">{s.label}</span>
            <span className="text-[13px] font-bold tabular-nums">{s.value}</span>
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================= Priority mix ============================= */

function PriorityMix({ mix, total }: { mix: Record<string, number>; total: number }) {
  const rows = [
    { key: "High", label: "สูง", color: C_CRIT, icon: <Flame className="size-3.5" /> },
    { key: "Medium", label: "กลาง", color: C_WARN, icon: <ArrowDownRight className="size-3.5" /> },
    { key: "Low", label: "ต่ำ", color: C_MUTED, icon: <ArrowDownRight className="size-3.5" /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-8 w-full gap-[3px] overflow-hidden rounded-lg">
        {rows.map((r) =>
          mix[r.key] > 0 ? (
            <div
              key={r.key}
              className="h-full first:rounded-l-lg last:rounded-r-lg"
              style={{ width: `${(mix[r.key] / total) * 100}%`, background: r.color, minWidth: 3 }}
              title={`${r.label}: ${mix[r.key]}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5" style={{ color: r.color }}>
              {r.icon}
            </span>
            <span className="flex-1 text-[12.5px] text-zinc-600 dark:text-zinc-300">ความสำคัญ{r.label}</span>
            <span className="text-[13px] font-bold tabular-nums">{mix[r.key]}</span>
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {total ? Math.round((mix[r.key] / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================= Project row ============================= */

function ProjectRow({
  p,
}: {
  p: { code: string; name: string; color: string; total: number; done: number; open: number; overdue: number; percent: number };
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="size-2.5 flex-none rounded-full" style={{ background: p.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">{p.name}</span>
          {p.overdue > 0 && (
            <span className="flex flex-none items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <TriangleAlert className="size-2.5" />
              {p.overdue}
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${p.percent}%`, background: p.color }} />
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="text-[13px] font-bold tabular-nums">{p.percent}%</div>
        <div className="text-[10.5px] text-muted-foreground">ค้าง {p.open}</div>
      </div>
    </div>
  );
}

/* ============================== Team table ============================= */

function TeamTable({
  rows,
  reportStatusById,
}: {
  rows: Insights["workload"];
  reportStatusById: Map<string, "submitted" | "missing" | "leave">;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-hairline pb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex-1">สมาชิก</span>
        <span className="w-10 text-center">ทำอยู่</span>
        <span className="w-10 text-center">ค้าง</span>
        <span className="w-24 text-center">ตรงเวลา</span>
        <span className="w-8 text-center">รายงาน</span>
      </div>
      <div className="flex flex-col divide-y divide-hairline">
        {rows.map((w) => {
          const status = reportStatusById.get(w.id);
          return (
            <div key={w.id} className="flex items-center gap-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Avatar userKey={w.avatarKey} size={26} fontSize={11} />
                <span className="truncate text-[12.5px] font-medium">{w.name}</span>
                {w.onLeave && (
                  <span className="flex-none rounded-full bg-zinc-100 px-1.5 py-px text-[9.5px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    ลา
                  </span>
                )}
              </div>
              <span className="w-10 text-center">
                {w.inProgress > 0 ? (
                  <span className="inline-block min-w-[22px] rounded-full bg-blue-50 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    {w.inProgress}
                  </span>
                ) : (
                  <span className="text-[12px] tabular-nums text-muted-foreground">0</span>
                )}
              </span>
              <span className="w-10 text-center text-[12.5px] font-semibold tabular-nums">{w.open}</span>
              <span className="w-24">
                <OnTimeBar rate={w.onTimeRate ?? null} closed={w.closed ?? 0} />
              </span>
              <span className="flex w-8 justify-center">
                <ReportDot status={status} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnTimeBar({ rate, closed }: { rate: number | null; closed: number }) {
  if (rate === null || closed === 0)
    return <span className="block text-center text-[11px] text-muted-foreground">—</span>;
  const color = rate >= 80 ? C_GOOD : rate >= 60 ? C_WARN : C_CRIT;
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
      </span>
      <span className="w-7 flex-none text-right text-[11px] font-semibold tabular-nums" style={{ color }}>
        {rate}%
      </span>
    </span>
  );
}

function ReportDot({ status }: { status?: "submitted" | "missing" | "leave" }) {
  if (status === "submitted")
    return <span title="ส่งแล้ว"><CheckCircle2 className="size-4 text-emerald-500" /></span>;
  if (status === "leave")
    return <span title="ลา"><CalendarOff className="size-4 text-zinc-400" /></span>;
  if (status === "missing")
    return <span title="ยังไม่ส่ง" className="block size-2.5 rounded-full" style={{ background: C_CRIT }} />;
  return <span className="block size-2.5 rounded-full bg-muted" title="ไม่ต้องส่ง" />;
}

/* ========================== Blocker / completed ======================== */

function BlockerRow({ b }: { b: Insights["topBlockers"][number] }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
      <Avatar userKey={b.author.avatarKey} size={26} fontSize={11} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">{b.author.name}</span>
          <span className="size-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="font-medium" style={{ color: b.project.color }}>{b.project.code}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-zinc-700 dark:text-zinc-200 [overflow-wrap:anywhere]">
          {b.text}
        </p>
      </div>
    </div>
  );
}

function CompletedRow({ c }: { c: Insights["recentlyCompleted"][number] }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <CheckCircle2 className="size-4 flex-none text-emerald-500" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-700 dark:text-zinc-200">{c.title}</span>
      <span className="flex-none text-[10.5px] font-medium" style={{ color: c.project.color }}>
        {c.project.code}
      </span>
      {c.assignee && <Avatar userKey={c.assignee.avatarKey} size={22} fontSize={10} />}
    </div>
  );
}

/* ============================== Primitives ============================= */

function Panel({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3.5 flex items-center gap-2">
        {icon && <span className="text-teal-600 dark:text-teal-400">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold leading-tight">{title}</div>
          {subtitle && <div className="text-[11.5px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === o.value
              ? "bg-teal-600 text-white"
              : "text-zinc-600 hover:bg-muted dark:text-zinc-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200">
      <TriangleAlert className="size-4 flex-none" />
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-[12.5px] text-muted-foreground">{text}</div>;
}
