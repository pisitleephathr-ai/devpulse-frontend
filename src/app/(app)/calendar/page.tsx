"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { Select } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/mock-data";

type EventType = "LEAVE" | "DEADLINE";

type ApiEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: EventType;
};

type DayEvent = { label: string; type: EventType };
type Cell = { day: number | null; today: boolean };

const EVENT_STYLE: Record<EventType, { background: string; color: string }> = {
  LEAVE: { background: "#ccfbf1", color: "#0f766e" },
  DEADLINE: { background: "#ede9fe", color: "#6d28d9" },
};

// Thai month names (1-indexed via [m-1]).
const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const EN_MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

// "Today" comes from the app's context date (2026-07-10). Kept as constants so
// the month math stays deterministic without relying on the client clock.
const TODAY_YEAR = 2026;
const TODAY_MONTH = 7; // 1-indexed
const TODAY_DAY = 10;

/** Leading blanks + numbered days + trailing blanks for a given month grid. */
function buildCells(year: number, month: number): Cell[] {
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isCurrentMonth = year === TODAY_YEAR && month === TODAY_MONTH;
  const cells: Cell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, today: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, today: isCurrentMonth && d === TODAY_DAY });
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false });
  return cells;
}

/** Expand ranged API events into a day-of-month → events map for the view month. */
function toDayMap(
  events: ApiEvent[],
  year: number,
  month: number
): Record<number, DayEvent[]> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const map: Record<number, DayEvent[]> = {};
  for (const ev of events) {
    const s = new Date(ev.startDate);
    const e = new Date(ev.endDate);
    const inMonth = (d: Date) =>
      d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;
    const startDay = inMonth(s) ? s.getUTCDate() : 1;
    const endDay = inMonth(e) ? e.getUTCDate() : daysInMonth;
    for (let day = startDay; day <= endDay; day++) {
      (map[day] ??= []).push({ label: ev.title, type: ev.type });
    }
  }
  return map;
}

export default function CalendarPage() {
  const [year, setYear] = useState(TODAY_YEAR);
  const [month, setMonth] = useState(TODAY_MONTH); // 1-indexed
  const [typeF, setTypeF] = useState<"all" | EventType>("all");
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    api
      .get<{ events: ApiEvent[] }>(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => {
        if (!active) return;
        setEvents(r.events);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setEvents([]);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [year, month]);

  const visibleEvents = useMemo(
    () => (typeF === "all" ? events : events.filter((e) => e.type === typeF)),
    [events, typeF]
  );
  const dayMap = useMemo(
    () => toDayMap(visibleEvents, year, month),
    [visibleEvents, year, month]
  );
  const cells = useMemo(() => buildCells(year, month), [year, month]);

  const hasEvents = visibleEvents.length > 0;

  function step(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
            TEAM CALENDAR · {EN_MONTHS[month - 1]} {year}
          </div>
          <h1 className="text-[19px] font-bold tracking-[-0.02em]">
            {TH_MONTHS[month - 1]} {year + 543}
          </h1>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => step(-1)}
            aria-label="เดือนก่อนหน้า"
            className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={() => step(1)}
            aria-label="เดือนถัดไป"
            className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <ChevronRight className="size-3.5" />
          </button>
          {(year !== TODAY_YEAR || month !== TODAY_MONTH) && (
            <button
              onClick={() => {
                setYear(TODAY_YEAR);
                setMonth(TODAY_MONTH);
              }}
              className="ml-1 rounded-[7px] border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              วันนี้
            </button>
          )}
        </div>
        <div className="flex-1" />
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={typeF}
          onChange={(e) => setTypeF(e.target.value as "all" | EventType)}
        >
          <option value="all">ทุกประเภท</option>
          <option value="LEAVE">ลาที่อนุมัติแล้ว</option>
          <option value="DEADLINE">กำหนดส่งงาน</option>
        </Select>
        <div className="flex items-center gap-3.5 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-teal-600" />
            ลาที่อนุมัติแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px] bg-violet-600" />
            กำหนดส่งงาน
          </span>
        </div>
      </div>

      {/* Empty-state banner when the month has no (matching) events */}
      {loaded && !hasEvents && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-2.5 text-[12.5px] text-zinc-500">
          <CalendarDays className="size-4 text-zinc-400" />
          {typeF === "all"
            ? "ไม่มีกิจกรรมในเดือนนี้"
            : "ไม่มีกิจกรรมประเภทนี้ในเดือนนี้"}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-7 border-b border-hairline">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="p-2.5 text-center text-[11.5px] font-semibold text-zinc-500"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayEvents = cell.day ? dayMap[cell.day] ?? [] : [];
            return (
              <div
                key={i}
                className="min-h-24 border-b border-r border-hairline-soft p-2"
                style={{ background: cell.day ? "#ffffff" : "#fafafa" }}
              >
                {cell.day && (
                  <>
                    <div
                      className="mb-1.5 flex size-6 items-center justify-center rounded-full text-xs"
                      style={
                        cell.today
                          ? {
                              background: "#0d9488",
                              color: "#ffffff",
                              fontWeight: 700,
                            }
                          : { color: "#3f3f46" }
                      }
                    >
                      {cell.day}
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      {dayEvents.map((ev, j) => (
                        <div
                          key={j}
                          className="truncate rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-medium"
                          style={EVENT_STYLE[ev.type]}
                        >
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
