import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  WEEKDAYS,
  CALENDAR_EVENTS,
  CALENDAR_TODAY,
  CALENDAR_LEADING_BLANKS,
  CALENDAR_DAYS_IN_MONTH,
} from "@/lib/mock-data";

type Cell = { day: number | null; today: boolean };

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < CALENDAR_LEADING_BLANKS; i++)
    cells.push({ day: null, today: false });
  for (let d = 1; d <= CALENDAR_DAYS_IN_MONTH; d++)
    cells.push({ day: d, today: d === CALENDAR_TODAY });
  while (cells.length % 7 !== 0) cells.push({ day: null, today: false });
  return cells;
}

const EVENT_STYLE = {
  leave: { background: "#ccfbf1", color: "#0f766e" },
  task: { background: "#ede9fe", color: "#6d28d9" },
} as const;

export default function CalendarPage() {
  const cells = buildCells();

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
            const events = cell.day ? CALENDAR_EVENTS[cell.day] ?? [] : [];
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
