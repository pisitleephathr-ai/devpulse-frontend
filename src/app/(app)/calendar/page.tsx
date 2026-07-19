"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  FileText,
  Plane,
  CalendarOff,
  KanbanSquare,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { CalendarSkeleton } from "@/components/skeletons";
import { WEEKDAYS } from "@/lib/mock-data";
import { bangkokDateISO } from "@/lib/thai-datetime";
import { formatThaiDate } from "@/lib/mappers";

type CalType = "TASK" | "REPORT" | "LEAVE" | "EVENT" | "HOLIDAY";

type CalItem = {
  id: string;
  type: CalType;
  title: string;
  date: string;
  endDate?: string;
  project?: { id: string; name: string; code: string; color: string } | null;
  user?: { id: string; name: string; avatarKey: string } | null;
  status?: string | null;
  priority?: string | null;
  halfDayPeriod?: string | null;
  holidayType?: string | null;
  description?: string | null;
  entityId: string;
};

const TYPE_META: Record<
  CalType,
  { label: string; cls: string; dot: string; href: string; icon: LucideIcon }
> = {
  HOLIDAY: { label: "วันหยุด", cls: "cal-pill-holiday", dot: "#e11d48", href: "/calendar", icon: CalendarOff },
  TASK: { label: "งาน", cls: "cal-pill-task", dot: "#2563eb", href: "/tasks", icon: KanbanSquare },
  REPORT: { label: "รายงาน", cls: "cal-pill-report", dot: "#0d9488", href: "/reports", icon: FileText },
  LEAVE: { label: "ลา", cls: "cal-pill-leave", dot: "#d97706", href: "/leaves", icon: Plane },
  EVENT: { label: "กิจกรรม", cls: "cal-pill-event", dot: "#7c3aed", href: "/calendar", icon: CalendarClock },
};

/** Flag a day when this many distinct people (or more) are on leave. */
const LEAVE_OVERLAP_THRESHOLD = 2;

const HALF_LABEL: Record<string, string> = { MORNING: "ครึ่งเช้า", AFTERNOON: "ครึ่งบ่าย" };
/** Label a leave / half-day / holiday item for display. */
function itemLabel(it: CalItem): string {
  if (it.type === "LEAVE" && it.halfDayPeriod) return `${it.title} · ${HALF_LABEL[it.halfDayPeriod] ?? "ครึ่งวัน"}`;
  return it.title;
}

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const EN_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

// "Today" in Asia/Bangkok, resolved at load so the current day is always right.
const [TODAY_YEAR, TODAY_MONTH, TODAY_DAY] = bangkokDateISO().split("-").map(Number);

type Cell = { day: number | null; today: boolean; offday: boolean };

/** `working` = set of weekday numbers (0=Sun…6=Sat) that ARE working days. */
function buildCells(year: number, month: number, working: Set<number>): Cell[] {
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isCurrent = year === TODAY_YEAR && month === TODAY_MONTH;
  const cells: Cell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, today: false, offday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    cells.push({ day: d, today: isCurrent && d === TODAY_DAY, offday: !working.has(dow) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false, offday: false });
  return cells;
}

const MAX_LANES = 4;
type WeekBar = { it: CalItem; startCol: number; span: number; lane: number; startDay: number };
type Week = { cells: Cell[]; bars: WeekBar[]; lanes: number; overflow: number };

/**
 * Lay items out as continuous horizontal bars per week: each item occupies one
 * segment per week it overlaps (spanning grid columns), stacked into lanes so a
 * multi-day item reads as a single bar rather than a repeated pill.
 */
function buildWeeks(cells: Cell[], items: CalItem[], year: number, month: number): Week[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const inMonth = (d: Date) => d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;
  const ranges = items.map((it) => {
    const s = new Date(it.date);
    const e = it.endDate ? new Date(it.endDate) : s;
    const a = inMonth(s) ? s.getUTCDate() : 1;
    const b = inMonth(e) ? e.getUTCDate() : daysInMonth;
    return { it, sd: Math.min(a, b), ed: Math.max(a, b) };
  });

  const weeks: Week[] = [];
  for (let w = 0; w < cells.length; w += 7) {
    const wcells = cells.slice(w, w + 7);
    const dayToCol = new Map<number, number>();
    let firstDay = Infinity;
    let lastDay = -Infinity;
    wcells.forEach((c, col) => {
      if (c.day) {
        dayToCol.set(c.day, col);
        firstDay = Math.min(firstDay, c.day);
        lastDay = Math.max(lastDay, c.day);
      }
    });

    const segs = ranges
      .map((r) => {
        const segStart = Math.max(r.sd, firstDay);
        const segEnd = Math.min(r.ed, lastDay);
        if (!isFinite(firstDay) || segStart > segEnd) return null;
        return { it: r.it, startCol: dayToCol.get(segStart)!, endCol: dayToCol.get(segEnd)!, startDay: segStart };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol));

    const laneEnds: number[] = [];
    const bars: WeekBar[] = [];
    let overflow = 0;
    for (const s of segs) {
      let lane = laneEnds.findIndex((end) => end < s.startCol);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(s.endCol);
      } else {
        laneEnds[lane] = s.endCol;
      }
      if (lane < MAX_LANES) {
        bars.push({ it: s.it, startCol: s.startCol, span: s.endCol - s.startCol + 1, lane, startDay: s.startDay });
      } else {
        overflow += 1;
      }
    }
    weeks.push({ cells: wcells, bars, lanes: Math.min(laneEnds.length, MAX_LANES), overflow });
  }
  return weeks;
}

/** Bucket items into day-of-month → items, expanding ranged items (leave/event). */
function toDayMap(items: CalItem[], year: number, month: number): Record<number, CalItem[]> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const map: Record<number, CalItem[]> = {};
  const inMonth = (d: Date) => d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;
  for (const it of items) {
    const s = new Date(it.date);
    const e = it.endDate ? new Date(it.endDate) : s;
    const startDay = inMonth(s) ? s.getUTCDate() : 1;
    const endDay = inMonth(e) ? e.getUTCDate() : daysInMonth;
    for (let day = startDay; day <= endDay; day++) {
      (map[day] ??= []).push(it);
    }
  }
  return map;
}

export default function CalendarPage() {
  const [year, setYear] = useState(TODAY_YEAR);
  const [month, setMonth] = useState(TODAY_MONTH);
  const [typeF, setTypeF] = useState<"all" | CalType>("all");
  const [projectF, setProjectF] = useState("all");
  const [items, setItems] = useState<CalItem[]>([]);
  const [workingDays, setWorkingDays] = useState("1,2,3,4,5");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    api
      .get<{ items: CalItem[]; workingDays?: string }>(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => {
        if (!active) return;
        setItems(r.items ?? []);
        if (r.workingDays) setWorkingDays(r.workingDays);
        setError(false);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setError(true);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [year, month]);

  const projects = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (it.project) m.set(it.project.code, it.project.name);
    return [...m.entries()];
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter(
        (it) =>
          (typeF === "all" || it.type === typeF) &&
          (projectF === "all" || it.project?.code === projectF)
      ),
    [items, typeF, projectF]
  );

  const workingSet = useMemo(
    () => new Set(workingDays.split(",").filter(Boolean).map(Number)),
    [workingDays]
  );
  const dayMap = useMemo(() => toDayMap(visible, year, month), [visible, year, month]);
  const cells = useMemo(() => buildCells(year, month, workingSet), [year, month, workingSet]);
  const weeks = useMemo(() => buildWeeks(cells, visible, year, month), [cells, visible, year, month]);
  const hasItems = visible.length > 0;

  function step(delta: number) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    setOpenDay(null);
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
            TEAM CALENDAR · {EN_MONTHS[month - 1]} {year}
          </div>
          <h1 className="text-[19px] font-bold tracking-[-0.02em]">
            {TH_MONTHS[month - 1]} {year + 543}
          </h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => step(-1)} aria-label="เดือนก่อนหน้า" className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100">
            <ChevronLeft className="size-3.5" />
          </button>
          <button onClick={() => step(1)} aria-label="เดือนถัดไป" className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100">
            <ChevronRight className="size-3.5" />
          </button>
          {(year !== TODAY_YEAR || month !== TODAY_MONTH) && (
            <button
              onClick={() => { setYear(TODAY_YEAR); setMonth(TODAY_MONTH); }}
              className="ml-1 rounded-[7px] border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              วันนี้
            </button>
          )}
        </div>
        <div className="flex-1" />
        <Select className="w-auto py-[7px] text-[12.5px]" value={typeF} onChange={(e) => setTypeF(e.target.value as "all" | CalType)}>
          <option value="all">ทุกประเภท</option>
          <option value="TASK">งาน</option>
          <option value="LEAVE">การลา</option>
          <option value="EVENT">กิจกรรม</option>
        </Select>
        {projects.length > 0 && (
          <Select className="w-auto py-[7px] text-[12.5px]" value={projectF} onChange={(e) => setProjectF(e.target.value)}>
            <option value="all">ทุกโปรเจกต์</option>
            {projects.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
        {(Object.keys(TYPE_META) as CalType[]).filter((t) => t !== "REPORT").map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px]" style={{ background: TYPE_META[t].dot }} />
            {TYPE_META[t].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px] bg-rose-100 ring-1 ring-rose-300 dark:bg-rose-950/40" />
          วันหยุด (นอกวันทำงาน)
        </span>
      </div>

      {/* Empty / error banners */}
      {loaded && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-800">
          โหลดปฏิทินไม่สำเร็จ
        </div>
      )}
      {loaded && !error && !hasItems && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2.5 text-[12.5px] text-muted-foreground">
          <CalendarDays className="size-4 text-muted-foreground" />
          ไม่มีกิจกรรมในเดือนนี้
        </div>
      )}

      {/* Grid */}
      {!loaded ? (
        <CalendarSkeleton />
      ) : (
      <div className="flex h-[calc(100vh-13rem)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid flex-none grid-cols-7 border-b border-hairline">
          {WEEKDAYS.map((w) => (
            <div key={w} className="p-2.5 text-center text-[11.5px] font-semibold text-muted-foreground">{w}</div>
          ))}
        </div>
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="relative grid grid-cols-7 overflow-hidden border-b border-hairline-soft last:border-b-0"
              style={{ gridTemplateRows: `26px repeat(${week.lanes}, 19px) 1fr` }}
            >
              {/* Day cells (full-height backgrounds) + number + warnings. */}
              {week.cells.map((cell, c) => {
                const dayItems = cell.day ? dayMap[cell.day] ?? [] : [];
                const hasHoliday = dayItems.some((it) => it.type === "HOLIDAY");
                const leaveCount = new Set(
                  dayItems.filter((it) => it.type === "LEAVE").map((it) => it.user?.id ?? it.entityId)
                ).size;
                const leaveOverlap = leaveCount >= LEAVE_OVERLAP_THRESHOLD;
                const nonWorking = cell.offday || hasHoliday;
                return (
                  <div
                    key={c}
                    style={{ gridColumn: c + 1, gridRow: "1 / -1" }}
                    className={`border-r border-hairline-soft last:border-r-0 ${
                      !cell.day
                        ? "bg-muted/40"
                        : nonWorking
                        ? "bg-rose-50/50 dark:bg-rose-950/15"
                        : "bg-card"
                    } ${cell.day && dayItems.length ? "cursor-pointer hover:bg-muted/40" : ""}`}
                    onClick={() => cell.day && dayItems.length && setOpenDay(cell.day)}
                  >
                    {cell.day && (
                      <div className="flex items-center justify-between px-1.5 pt-1">
                        <div
                          className={`flex size-6 items-center justify-center rounded-full text-xs ${
                            cell.today
                              ? "font-bold text-white"
                              : cell.offday
                              ? "font-medium text-rose-500 dark:text-rose-400"
                              : "text-zinc-700 dark:text-zinc-200"
                          }`}
                          style={cell.today ? { background: "#0d9488" } : undefined}
                        >
                          {cell.day}
                        </div>
                        <div className="flex items-center gap-1">
                          {leaveOverlap && (
                            <span
                              className="rounded-full bg-amber-100 px-1.5 text-[9.5px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              title={`${leaveCount} คนลาในวันนี้ — ระวังคนทำงานไม่พอ`}
                            >
                              ⚠ {leaveCount} ลา
                            </span>
                          )}
                          {nonWorking && !cell.today && (
                            <span className="text-[9.5px] font-semibold text-rose-500/80 dark:text-rose-400/80">หยุด</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Continuous bars spanning their day range within this week. */}
              {week.bars.map((b) => (
                <div
                  key={b.it.id}
                  style={{ gridColumn: `${b.startCol + 1} / span ${b.span}`, gridRow: b.lane + 2 }}
                  className={`z-10 mx-[3px] flex items-center gap-1.5 overflow-hidden rounded-[5px] px-1.5 text-[10.5px] font-medium ${TYPE_META[b.it.type].cls}`}
                  title={`${TYPE_META[b.it.type].label}: ${itemLabel(b.it)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDay(b.startDay);
                  }}
                >
                  <span
                    className="size-1.5 flex-none rounded-full"
                    style={{ background: b.it.project?.color ?? TYPE_META[b.it.type].dot }}
                    aria-hidden
                  />
                  <span className="truncate">{itemLabel(b.it)}</span>
                </div>
              ))}

              {week.overflow > 0 && (
                <div
                  style={{ gridColumn: "1 / -1", gridRow: week.lanes + 2 }}
                  className="z-10 px-1.5 text-[10px] font-medium text-zinc-400"
                >
                  +{week.overflow} เพิ่มเติม
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Day detail modal */}
      {openDay !== null && (
        <DayModal
          monthLabel={`${openDay} ${TH_MONTHS[month - 1]} ${year + 543}`}
          items={dayMap[openDay] ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

function DayModal({
  monthLabel,
  items,
  onClose,
}: {
  monthLabel: string;
  items: CalItem[];
  onClose: () => void;
}) {
  return (
    <div onMouseDown={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6">
      <div onMouseDown={(e) => e.stopPropagation()} className="dp-pop max-h-[80vh] w-[460px] max-w-full overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between border-b border-hairline px-[22px] py-[16px]">
          <div className="text-[14px] font-semibold">{monthLabel}</div>
          <button onClick={onClose} aria-label="ปิด" className="flex size-7 items-center justify-center rounded-[7px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex max-h-[calc(80vh-64px)] flex-col divide-y divide-hairline-soft overflow-y-auto">
          {items.map((it) => {
            const meta = TYPE_META[it.type];
            const Icon = meta.icon;
            const isRange =
              !!it.endDate && it.endDate.slice(0, 10) !== it.date.slice(0, 10);
            return (
              <Link
                key={it.id}
                href={
                  it.type === "TASK"
                    ? `/tasks?task=${it.entityId}`
                    : meta.href
                }
                className="flex items-start gap-3 px-[22px] py-3 transition-colors hover:bg-muted/50"
              >
                <span
                  className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-lg"
                  style={{ background: `${meta.dot}1a`, color: meta.dot }}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{itemLabel(it)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
                    <span className="font-medium" style={{ color: meta.dot }}>
                      {meta.label}
                    </span>
                    {it.project && (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full" style={{ background: it.project.color }} />
                        {it.project.name}
                      </span>
                    )}
                    {it.type === "TASK" && it.status && <span>สถานะ: {it.status}</span>}
                    {isRange && (
                      <span>
                        {formatThaiDate(it.date)} – {formatThaiDate(it.endDate!)}
                      </span>
                    )}
                    {it.type === "HOLIDAY" && it.description && (
                      <span className="truncate">{it.description}</span>
                    )}
                  </div>
                </div>
                {it.user && (
                  <div className="flex flex-none flex-col items-center gap-1 pt-0.5">
                    <Avatar userKey={it.user.avatarKey} size={26} fontSize={10} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
