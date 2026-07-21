"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { FormSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api";
import { bangkokDateISO } from "@/lib/thai-datetime";
import { CalendarRange } from "lucide-react";

/* ------------------------------- API types ------------------------------ */

type Proj = { code: string; color: string; name: string } | null;
type PlanTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  estimatedFinishAt: string | null;
  startedAt: string | null;
  project: Proj;
};
type PlanDay = { date: string; weekday: number; isWorkingDay: boolean; holiday: string | null };
type PlanPerson = {
  id: string;
  name: string;
  avatarKey: string;
  openCount: number;
  freeFrom: string | null;
  onLeaveDates: string[];
  tasks: PlanTask[];
};
type Plan = { weeks: number; weekStart: string; days: PlanDay[]; people: PlanPerson[] };

/* ------------------------------- helpers -------------------------------- */

const WD_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
// Task status → dot color (mirrors the board palette).
const STATUS_DOT: Record<string, string> = {
  TODO: "#a1a1aa",
  IN_PROGRESS: "#3b82f6",
  DEV_REVIEW: "#8b5cf6",
  DEV_DONE: "#06b6d4",
  TESTING: "#f59e0b",
  DELIVERY_DONE: "#10b981",
  DELIVERY_FAIL: "#ef4444",
};

/** UTC ISO → Bangkok "YYYY-MM-DD" (to match a day cell). */
function bkkDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}
/** "YYYY-MM-DD" → e.g. "14 ก.ค." */
function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  });
}
/** Free-from ISO → e.g. "ว่าง 18 มี.ค. 10:00" or "ว่างตอนนี้". */
function freeLabel(iso: string | null): string {
  if (!iso) return "ว่างตอนนี้";
  const s = new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `ว่าง ${s}`;
}

export default function PlanPage() {
  const [weeks, setWeeks] = useState<1 | 2>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get<Plan>(`/api/dashboard/plan?weeks=${weeks}`)
      .then((p) => active && setPlan(p))
      .catch(() => active && setPlan(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [weeks]);

  // Bangkok "today" via the shared helper (keeps render pure — no Date.now()).
  const todayStr = bangkokDateISO();
  // Show only working days — drop weekends / company holidays from the columns.
  const days = plan ? plan.days.filter((d) => d.isWorkingDay) : [];
  const gridCols = plan
    ? `190px repeat(${days.length}, minmax(84px, 1fr))`
    : undefined;

  // Quick summary groups (derived — no side effects).
  const working = plan ? plan.people.filter((p) => p.openCount > 0) : [];
  const idle = plan ? plan.people.filter((p) => p.openCount === 0) : [];
  const freeing = plan
    ? plan.people
        .filter((p) => p.freeFrom)
        .sort((a, b) => (a.freeFrom! < b.freeFrom! ? -1 : 1))
    : [];
  const busyNoEstimate = working.filter((p) => !p.freeFrom).length;

  return (
    <div className="px-4 py-6 sm:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader
          eyebrow="PLAN"
          title="แผนงานรายสัปดาห์"
          description="ปฏิทินภาระงานของทีม — ใครกำลังทำอะไร และจะว่างช่วงไหน (อิงคาดการณ์เสร็จ)"
        />

        {/* week toggle */}
        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-0.5">
          {([1, 2] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeeks(w)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                weeks === w
                  ? "bg-teal-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {w} สัปดาห์
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-4">
            <FormSkeleton sections={3} />
          </div>
        ) : !plan || plan.people.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<CalendarRange className="size-6" />}
              title="ยังไม่มีข้อมูลแผนงาน"
              description="เพิ่มผู้รับผิดชอบและคาดการณ์เสร็จให้งานบนบอร์ด แล้วแผนงานจะแสดงที่นี่"
            />
          </div>
        ) : (
          <>
          {/* quick summary — who's working, who's free, who frees up when */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard tone="amber" title="กำลังทำงาน" count={working.length}>
              {working.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {working.slice(0, 8).map((p) => (
                    <span key={p.id} className="flex items-center gap-1 rounded-full bg-muted/60 py-0.5 pl-0.5 pr-2 text-[11.5px]">
                      <Avatar userKey={p.avatarKey} size={18} fontSize={8} />
                      <span className="max-w-[92px] truncate">{p.name}</span>
                    </span>
                  ))}
                  {working.length > 8 && (
                    <span className="text-[11.5px] text-muted-foreground">+{working.length - 8}</span>
                  )}
                </div>
              ) : (
                <span className="text-[12px] text-muted-foreground">ไม่มีใครมีงานค้าง</span>
              )}
            </SummaryCard>

            <SummaryCard tone="emerald" title="ยังว่าง" count={idle.length}>
              {idle.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {idle.slice(0, 8).map((p) => (
                    <span key={p.id} className="flex items-center gap-1 rounded-full bg-muted/60 py-0.5 pl-0.5 pr-2 text-[11.5px]">
                      <Avatar userKey={p.avatarKey} size={18} fontSize={8} />
                      <span className="max-w-[92px] truncate">{p.name}</span>
                    </span>
                  ))}
                  {idle.length > 8 && (
                    <span className="text-[11.5px] text-muted-foreground">+{idle.length - 8}</span>
                  )}
                </div>
              ) : (
                <span className="text-[12px] text-muted-foreground">ทุกคนมีงานอยู่</span>
              )}
            </SummaryCard>

            <SummaryCard tone="teal" title="เริ่มว่างเมื่อไร" count={freeing.length}>
              {freeing.length ? (
                <ul className="flex flex-col gap-1">
                  {freeing.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="flex-none tabular-nums text-muted-foreground">
                        {freeLabel(p.freeFrom).replace("ว่าง ", "")}
                      </span>
                    </li>
                  ))}
                  {freeing.length > 4 && (
                    <li className="text-[11.5px] text-muted-foreground">และอีก {freeing.length - 4} คน</li>
                  )}
                </ul>
              ) : (
                <span className="text-[12px] text-muted-foreground">ยังไม่มีคิวว่างที่ระบุ</span>
              )}
              {busyNoEstimate > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  มีงานแต่ยังไม่ระบุคาดการณ์เสร็จ {busyNoEstimate} คน
                </p>
              )}
            </SummaryCard>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="min-w-[820px]">
              {/* header: day columns */}
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="sticky left-0 z-10 flex items-end bg-card px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  สมาชิก
                </div>
                {days.map((d) => {
                  const isToday = d.date === todayStr;
                  return (
                    <div
                      key={d.date}
                      className="border-l border-hairline-soft px-1.5 py-2 text-center"
                    >
                      <div className="text-[10.5px] text-muted-foreground">{WD_TH[d.weekday]}</div>
                      <div
                        className={`text-[12px] font-semibold ${
                          isToday
                            ? "mx-auto flex size-6 items-center justify-center rounded-full bg-teal-600 text-white"
                            : ""
                        }`}
                      >
                        {new Date(`${d.date}T00:00:00+07:00`).toLocaleDateString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* one row per person */}
              {plan.people.map((p) => {
                const leaveSet = new Set(p.onLeaveDates);
                // Bucket tasks with an estimate by their Bangkok finish day.
                const byDay = new Map<string, PlanTask[]>();
                let noEstimate = 0;
                for (const t of p.tasks) {
                  const d = bkkDate(t.estimatedFinishAt);
                  if (!d) {
                    noEstimate += 1;
                    continue;
                  }
                  const arr = byDay.get(d) ?? [];
                  arr.push(t);
                  byDay.set(d, arr);
                }
                return (
                  <div
                    key={p.id}
                    className="grid border-b border-hairline-soft last:border-b-0"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    {/* person cell */}
                    <div className="sticky left-0 z-10 flex items-center gap-2.5 bg-card px-3.5 py-3">
                      <Avatar userKey={p.avatarKey} size={30} fontSize={11} />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold">{p.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block size-1.5 rounded-full ${
                              p.freeFrom ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <span className="truncate text-[11px] text-muted-foreground">
                            {freeLabel(p.freeFrom)}
                            {noEstimate > 0 && ` · ${noEstimate} ไม่ระบุ`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* day cells */}
                    {days.map((d) => {
                      const onLeave = leaveSet.has(d.date);
                      const tks = byDay.get(d.date) ?? [];
                      return (
                        <div
                          key={d.date}
                          className={`min-h-[54px] border-l border-hairline-soft p-1 ${
                            onLeave ? "bg-rose-50 dark:bg-rose-950/30" : ""
                          }`}
                        >
                          {onLeave && (
                            <div className="mb-1 rounded bg-rose-100 px-1 py-0.5 text-center text-[9.5px] font-semibold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                              ลา
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            {tks.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => router.push(`/tasks?task=${t.id}`)}
                                title={`${t.title}${t.project ? ` · ${t.project.name}` : ""}`}
                                className="flex items-center gap-1 rounded-md border border-hairline bg-card px-1.5 py-1 text-left transition-colors hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                              >
                                <span
                                  className="size-1.5 flex-none rounded-full"
                                  style={{ background: STATUS_DOT[t.status] ?? "#a1a1aa" }}
                                />
                                <span className="truncate text-[10.5px] font-medium leading-tight">
                                  {t.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}

        {/* legend */}
        {!loading && plan && plan.people.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" /> ว่างตอนนี้
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-amber-500" /> มีงานค้างถึงวันที่ระบุ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded bg-rose-100 dark:bg-rose-900/40" /> วันลา
            </span>
            <span>แสดงเฉพาะวันทำงาน · งานวางตามวัน “คาดการณ์เสร็จ”</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** A compact summary card with a colored count chip. */
function SummaryCard({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "amber" | "emerald" | "teal";
  children: ReactNode;
}) {
  const toneCls =
    tone === "amber"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300";
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[12.5px] font-semibold">{title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${toneCls}`}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
