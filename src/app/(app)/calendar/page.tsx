"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import {
  WEEKDAYS,
  CALENDAR_TODAY,
  CALENDAR_LEADING_BLANKS,
  CALENDAR_DAYS_IN_MONTH,
} from "@/lib/mock-data";

type ApiEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: "LEAVE" | "DEADLINE";
};

type DayEvent = { label: string; type: "LEAVE" | "DEADLINE" };
type Cell = { day: number | null; today: boolean };

const EVENT_STYLE: Record<DayEvent["type"], { background: string; color: string }> = {
  LEAVE: { background: "#ccfbf1", color: "#0f766e" },
  DEADLINE: { background: "#ede9fe", color: "#6d28d9" },
};

// Fixed view: July 2026 (matches the handoff grid).
const YEAR = 2026;
const MONTH = 7; // 1-indexed

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < CALENDAR_LEADING_BLANKS; i++)
    cells.push({ day: null, today: false });
  for (let d = 1; d <= CALENDAR_DAYS_IN_MONTH; d++)
    cells.push({ day: d, today: d === CALENDAR_TODAY });
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false });
  return cells;
}

/** Expand ranged API events into a day-of-month → events map for the view month. */
function toDayMap(events: ApiEvent[]): Record<number, DayEvent[]> {
  const map: Record<number, DayEvent[]> = {};
  for (const ev of events) {
    const s = new Date(ev.startDate);
    const e = new Date(ev.endDate);
    const inMonth = (d: Date) =>
      d.getUTCFullYear() === YEAR && d.getUTCMonth() === MONTH - 1;
    const startDay = inMonth(s) ? s.getUTCDate() : 1;
    const endDay = inMonth(e) ? e.getUTCDate() : CALENDAR_DAYS_IN_MONTH;
    for (let day = startDay; day <= endDay; day++) {
      (map[day] ??= []).push({ label: ev.title, type: ev.type });
    }
  }
  return map;
}

export default function CalendarPage() {
  const cells = buildCells();
  const [dayMap, setDayMap] = useState<Record<number, DayEvent[]>>({});

  useEffect(() => {
    api
      .get<{ events: ApiEvent[] }>(`/api/calendar?year=${YEAR}&month=${MONTH}`)
      .then((r) => setDayMap(toDayMap(r.events)))
      .catch(() => setDayMap({}));
  }, []);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
            TEAM CALENDAR · JULY 2026
          </div>
          <h1 className="text-[19px] font-bold tracking-[-0.02em]">
            กรกฎาคม 2569
          </h1>
        </div>
        <div className="flex gap-1">
          <button className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100">
            <ChevronLeft className="size-3.5" />
          </button>
          <button className="flex size-7 items-center justify-center rounded-[7px] border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="flex-1" />
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
            const events = cell.day ? dayMap[cell.day] ?? [] : [];
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
                      {events.map((ev, j) => (
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
