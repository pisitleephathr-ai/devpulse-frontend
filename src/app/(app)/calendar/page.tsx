"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { api } from "@/lib/api";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { CalendarSkeleton } from "@/components/skeletons";
import { WEEKDAYS } from "@/lib/mock-data";

type CalType = "TASK" | "REPORT" | "LEAVE" | "EVENT";

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
  entityId: string;
};

const TYPE_META: Record<CalType, { label: string; cls: string; dot: string; href: string }> = {
  TASK: { label: "งาน", cls: "cal-pill-task", dot: "#2563eb", href: "/tasks" },
  REPORT: { label: "รายงาน", cls: "cal-pill-report", dot: "#0d9488", href: "/reports" },
  LEAVE: { label: "ลา", cls: "cal-pill-leave", dot: "#d97706", href: "/leaves" },
  EVENT: { label: "กิจกรรม", cls: "cal-pill-event", dot: "#7c3aed", href: "/calendar" },
};

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const EN_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

// "Today" from the app's context date (2026-07-10), kept deterministic.
const TODAY_YEAR = 2026, TODAY_MONTH = 7, TODAY_DAY = 10;

type Cell = { day: number | null; today: boolean };

function buildCells(year: number, month: number): Cell[] {
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isCurrent = year === TODAY_YEAR && month === TODAY_MONTH;
  const cells: Cell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, today: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, today: isCurrent && d === TODAY_DAY });
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false });
  return cells;
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
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    api
      .get<{ items: CalItem[] }>(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => {
        if (!active) return;
        setItems(r.items ?? []);
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

  const dayMap = useMemo(() => toDayMap(visible, year, month), [visible, year, month]);
  const cells = useMemo(() => buildCells(year, month), [year, month]);
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
          <option value="REPORT">รายงานประจำวัน</option>
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
      <div className="flex flex-wrap items-center gap-3.5 text-xs text-zinc-500">
        {(Object.keys(TYPE_META) as CalType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px]" style={{ background: TYPE_META[t].dot }} />
            {TYPE_META[t].label}
          </span>
        ))}
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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-7 border-b border-hairline">
          {WEEKDAYS.map((w) => (
            <div key={w} className="p-2.5 text-center text-[11.5px] font-semibold text-muted-foreground">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayItems = cell.day ? dayMap[cell.day] ?? [] : [];
            const shown = dayItems.slice(0, 3);
            const extra = dayItems.length - shown.length;
            return (
              <div
                key={i}
                className={`min-h-24 border-b border-r border-hairline-soft p-2 ${
                  cell.day ? "bg-card" : "bg-muted/40"
                } ${cell.day && dayItems.length ? "cursor-pointer hover:bg-muted/60" : ""}`}
                onClick={() => cell.day && dayItems.length && setOpenDay(cell.day)}
              >
                {cell.day && (
                  <>
                    <div
                      className={`mb-1.5 flex size-6 items-center justify-center rounded-full text-xs ${
                        cell.today ? "font-bold text-white" : "text-zinc-700"
                      }`}
                      style={cell.today ? { background: "#0d9488" } : undefined}
                    >
                      {cell.day}
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      {shown.map((it) => (
                        <div
                          key={it.id}
                          className={`flex items-center gap-1 truncate rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-medium ${TYPE_META[it.type].cls}`}
                          title={`${TYPE_META[it.type].label}: ${it.title}`}
                        >
                          <span className="truncate">{it.title}</span>
                        </div>
                      ))}
                      {extra > 0 && (
                        <div className="px-1.5 text-[10.5px] font-medium text-zinc-400">
                          +{extra} เพิ่มเติม
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
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
          {items.map((it) => (
            <Link
              key={it.id}
              href={TYPE_META[it.type].href}
              className="flex items-center gap-2.5 px-[22px] py-3 transition-colors hover:bg-zinc-50"
            >
              <span className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold ${TYPE_META[it.type].cls}`}>
                {TYPE_META[it.type].label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{it.title}</div>
                {it.project && <div className="truncate text-[11.5px] text-zinc-400">{it.project.name}</div>}
              </div>
              {it.user && <Avatar userKey={it.user.avatarKey} size={22} fontSize={9} />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
