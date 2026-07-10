"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Presentation,
  LayoutGrid,
  RefreshCw,
  Copy,
  BellRing,
  TriangleAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Check,
  ListTodo,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { formatThaiDateFull, bangkokDateISO } from "@/lib/thai-datetime";
import { cn } from "@/lib/utils";
import type { ApiUserMini } from "@/lib/mappers";

type Proj = { name: string; code: string; color: string };
type MiniTask = { id: string; title: string; status: string; priority: string };
type Report = {
  id: string;
  user: ApiUserMini;
  did: string;
  plan: string;
  blockers: string;
  project: Proj | null;
  status: string;
  tasks: MiniTask[];
};
type Standup = {
  date: string;
  stats: {
    submitted: number;
    missing: number;
    exempt: number;
    totalRequired: number;
    blockers: number;
    tasksDueToday: number;
  };
  submittedReports: Report[];
  missingUsers: ApiUserMini[];
  exemptUsers: ApiUserMini[];
  blockers: { id: string; user: ApiUserMini; text: string; project: Proj | null }[];
};

export default function StandupPage() {
  const me = useCurrentUser();
  const canManage = isManagerOrAdmin(me);
  const [data, setData] = useState<Standup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<"overview" | "meeting">("overview");

  function load() {
    setLoading(true);
    setError(false);
    api
      .get<Standup>(`/api/standup?date=${bangkokDateISO()}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-7">
      <PageHeader
        eyebrow="DAILY STANDUP"
        title="ประชุมอัปเดตงานประจำวัน"
        description={data ? formatThaiDateFull(new Date(`${data.date}T12:00:00+07:00`)) : "การประชุมเช้า 08:30"}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setMode("overview")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-[7px] text-[12.5px] font-medium transition-colors",
                  mode === "overview" ? "bg-teal-600 text-white" : "bg-card text-zinc-600 hover:bg-muted dark:text-zinc-300"
                )}
              >
                <LayoutGrid className="size-3.5" />
                ภาพรวม
              </button>
              <button
                onClick={() => setMode("meeting")}
                className={cn(
                  "flex items-center gap-1.5 border-l border-border px-2.5 py-[7px] text-[12.5px] font-medium transition-colors",
                  mode === "meeting" ? "bg-teal-600 text-white" : "bg-card text-zinc-600 hover:bg-muted dark:text-zinc-300"
                )}
              >
                <Presentation className="size-3.5" />
                โหมดประชุม
              </button>
            </div>
            <button
              onClick={load}
              className="flex size-[34px] items-center justify-center rounded-lg border border-border bg-card text-zinc-600 transition-colors hover:bg-muted dark:text-zinc-300"
              aria-label="รีเฟรช"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {loading && !data ? (
        <StandupSkeleton />
      ) : error && !data ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="text-[13px] text-red-800 dark:text-red-300">โหลดข้อมูลไม่สำเร็จ</span>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-card px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-muted dark:text-red-300">
            <RefreshCw className="size-3.5" /> ลองใหม่
          </button>
        </div>
      ) : data && mode === "overview" ? (
        <Overview data={data} canManage={canManage} onRemind={load} />
      ) : data ? (
        <Meeting data={data} />
      ) : null}
    </div>
  );
}

/* ------------------------------- Overview ------------------------------- */

function Overview({
  data,
  canManage,
  onRemind,
}: {
  data: Standup;
  canManage: boolean;
  onRemind: () => void;
}) {
  const s = data.stats;
  const [reminding, setReminding] = useState(false);

  function copyMissing() {
    const names = data.missingUsers.map((u) => u.name).join(", ");
    navigator.clipboard?.writeText(names).then(
      () => toast(`คัดลอก ${data.missingUsers.length} รายชื่อแล้ว`),
      () => toast("คัดลอกไม่สำเร็จ")
    );
  }
  async function remind() {
    setReminding(true);
    try {
      const r = await api.post<{ notified: number }>("/api/standup/remind", {
        date: data.date,
      });
      toast(`แจ้งเตือน ${r.notified} คนแล้ว`);
      onRemind();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "แจ้งเตือนไม่สำเร็จ");
    } finally {
      setReminding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="ส่งรายงานแล้ว" value={`${s.submitted}/${s.totalRequired}`} sub="ของผู้ที่ต้องส่ง" dot="#0d9488" />
        <StatCard label="ยังไม่ส่ง" value={String(s.missing)} sub="ต้องติดตาม" dot="#f59e0b" />
        <StatCard label="มีอุปสรรค" value={String(s.blockers)} sub="ต้องการความช่วยเหลือ" dot="#e11d48" />
        <StatCard label="งานที่ต้องทำวันนี้" value={String(s.tasksDueToday)} sub="ครบกำหนดวันนี้" dot="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Left: submitted reports */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>รายงานของทีม ({data.submittedReports.length})</CardTitle>
            </CardHeader>
            {data.submittedReports.length === 0 ? (
              <EmptyState icon={<FileText className="size-5" />} title="ยังไม่มีรายงานสำหรับวันนี้" description="รอสมาชิกส่งรายงานประจำวัน" />
            ) : (
              <div className="flex flex-col divide-y divide-hairline-soft">
                {data.submittedReports.map((r) => (
                  <ReportRow key={r.id} r={r} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Missing */}
          <Card>
            <CardHeader>
              <CardTitle>ยังไม่ส่งรายงานวันนี้ ({data.missingUsers.length})</CardTitle>
              {data.missingUsers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={copyMissing} className="flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:underline">
                    <Copy className="size-3.5" /> คัดลอกรายชื่อ
                  </button>
                  {canManage && (
                    <button onClick={remind} disabled={reminding} className="flex items-center gap-1 text-[12px] font-medium text-amber-600 hover:underline disabled:opacity-50">
                      <BellRing className="size-3.5" /> แจ้งเตือน
                    </button>
                  )}
                </div>
              )}
            </CardHeader>
            <div className="px-[18px] py-3">
              {data.missingUsers.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600">
                  <CheckCircle2 className="size-4" /> ทุกคนส่งรายงานแล้ว
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.missingUsers.map((u) => (
                    <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-0.5 pl-0.5 pr-2 text-[11.5px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                      {u.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Blockers */}
          <Card>
            <CardHeader>
              <CardTitle>อุปสรรคที่ต้องช่วยแก้ ({data.blockers.length})</CardTitle>
            </CardHeader>
            {data.blockers.length === 0 ? (
              <div className="flex items-center gap-2 px-[18px] py-5 text-[12.5px] text-emerald-600">
                <CheckCircle2 className="size-4" /> วันนี้ยังไม่มีอุปสรรคที่รายงาน
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-hairline-soft">
                {data.blockers.map((b) => (
                  <div key={b.id} className="px-[18px] py-2.5">
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 size-3.5 flex-none text-amber-500" />
                      <p className="flex-1 whitespace-pre-line text-[12.5px] leading-snug text-zinc-700">{b.text}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-[22px] text-[11px] text-muted-foreground">
                      <Avatar userKey={b.user.avatarKey} size={16} fontSize={7.5} />
                      {b.user.name}
                      {b.project && ` · ${b.project.name}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Exempt */}
          {data.exemptUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ไม่ต้องส่งรายงาน ({data.exemptUsers.length})</CardTitle>
              </CardHeader>
              <div className="flex flex-wrap gap-1.5 px-[18px] py-3">
                {data.exemptUsers.map((u) => (
                  <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-0.5 pl-0.5 pr-2 text-[11.5px] text-muted-foreground">
                    <Avatar userKey={u.avatarKey} size={18} fontSize={8} />
                    {u.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Meeting notes (local) */}
          {canManage && <MeetingNotes date={data.date} />}
        </div>
      </div>
    </div>
  );
}

function ReportRow({ r }: { r: Report }) {
  const hasBlocker = r.blockers.trim().length > 0;
  return (
    <div className="px-[18px] py-3">
      <div className="mb-1.5 flex items-center gap-2.5">
        <Avatar userKey={r.user.avatarKey} size={26} fontSize={10} />
        <span className="text-[13.5px] font-semibold">{r.user.name}</span>
        {r.project && (
          <span className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${r.project.color}22`, color: r.project.color }}>
            {r.project.code}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="เมื่อวาน" text={r.did} />
        <Field label="วันนี้" text={r.plan} />
      </div>
      {hasBlocker && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="mb-0.5 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <TriangleAlert className="size-3" /> อุปสรรค
          </div>
          <p className="whitespace-pre-line text-[12px] leading-snug text-amber-900 dark:text-amber-200">{r.blockers}</p>
        </div>
      )}
      {r.tasks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.tasks.map((t) => (
            <Link key={t.id} href="/tasks" className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-zinc-600 hover:bg-muted dark:text-zinc-300">
              <ListTodo className="size-3" />
              <span className="max-w-[160px] truncate">{t.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {text?.trim() ? (
        <p className="whitespace-pre-line text-[12.5px] leading-snug text-zinc-700">{text}</p>
      ) : (
        <p className="text-[12.5px] italic text-zinc-300 dark:text-zinc-600">—</p>
      )}
    </div>
  );
}

/* ------------------------------- Meeting -------------------------------- */

type QueueItem = { user: ApiUserMini; report: Report | null };

function Meeting({ data }: { data: Standup }) {
  const queue: QueueItem[] = useMemo(
    () => [
      ...data.submittedReports.map((r) => ({ user: r.user, report: r })),
      ...data.missingUsers.map((u) => ({ user: u, report: null })),
    ],
    [data]
  );
  const [idx, setIdx] = useState(0);
  const [spoken, setSpoken] = useState<Set<string>>(new Set());

  const total = queue.length;
  const cur = queue[idx];

  // Keyboard navigation for hands-free driving during the meeting.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, total - 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (total === 0) {
    return <EmptyState icon={<Presentation className="size-5" />} title="ยังไม่มีรายงานสำหรับวันนี้" description="เริ่มโหมดประชุมได้เมื่อมีสมาชิกส่งรายงาน" />;
  }

  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  const markSpoken = () => {
    setSpoken((s) => new Set(s).add(cur.user.id));
    next();
  };

  const r = cur.report;
  const hasBlocker = !!r && r.blockers.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold tabular-nums">
          {idx + 1} / {total} คน
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        <span className="text-[12px] text-muted-foreground">พูดแล้ว {spoken.size}/{total}</span>
      </div>

      {/* Big card */}
      <Card className="dp-pop">
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar userKey={cur.user.avatarKey} size={52} fontSize={20} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">{cur.user.name}</h2>
                {spoken.has(cur.user.id) && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40">
                    <Check className="size-3" /> พูดแล้ว
                  </span>
                )}
              </div>
              {r?.project && <div className="text-[13px] text-muted-foreground">{r.project.name}</div>}
            </div>
          </div>

          {!r ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-[14px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <TriangleAlert className="size-5" /> ยังไม่ได้ส่งรายงานวันนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BigField label="สิ่งที่ทำเมื่อวาน" text={r.did} />
              <BigField label="แผนงานวันนี้" text={r.plan} />
              <div className="md:col-span-2">
                {hasBlocker ? (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="size-4" /> ปัญหา / อุปสรรค
                    </div>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-amber-900 dark:text-amber-100">{r.blockers}</p>
                  </div>
                ) : (
                  <div className="text-[13px] text-muted-foreground">ไม่มีอุปสรรค</div>
                )}
              </div>
              {r.tasks.length > 0 && (
                <div className="md:col-span-2">
                  <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">งานที่เกี่ยวข้อง</div>
                  <div className="flex flex-wrap gap-2">
                    {r.tasks.map((t) => (
                      <span key={t.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[12.5px]">
                        <ListTodo className="size-3.5 text-muted-foreground" />
                        {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button onClick={prev} disabled={idx === 0} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-muted disabled:opacity-40 dark:text-zinc-200">
          <ChevronLeft className="size-4" /> คนก่อนหน้า
        </button>
        <button onClick={next} disabled={idx >= total - 1} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-muted disabled:opacity-40 dark:text-zinc-200">
          ข้าม <SkipForward className="size-4" />
        </button>
        <button onClick={markSpoken} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-700">
          <Check className="size-4" /> ทำเครื่องหมายว่าพูดแล้ว
        </button>
        <button onClick={next} disabled={idx >= total - 1} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-muted disabled:opacity-40 dark:text-zinc-200">
          คนถัดไป <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function BigField({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {text?.trim() ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100">{text}</p>
      ) : (
        <p className="text-[15px] italic text-zinc-300 dark:text-zinc-600">—</p>
      )}
    </div>
  );
}

/* --------------------------- Meeting notes (local) ---------------------- */

function MeetingNotes({ date }: { date: string }) {
  const key = `devpulse_standup_notes_${date}`;
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(window.localStorage.getItem(key) ?? "");
  }, [key]);

  function save() {
    window.localStorage.setItem(key, notes);
    setSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    toast("บันทึกโน้ตการประชุมแล้ว");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>โน้ตการประชุม</CardTitle>
        <span className="text-[11px] text-muted-foreground">บันทึกในเครื่องนี้</span>
      </CardHeader>
      <div className="flex flex-col gap-2 px-[18px] py-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="สรุปการประชุม / สิ่งที่ต้องทำ (action items)…"
          className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] leading-relaxed text-foreground outline-none focus:border-teal-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{savedAt ? `บันทึกล่าสุด ${savedAt}` : ""}</span>
          <button onClick={save} className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-teal-700">
            บันทึกโน้ต
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------- Skeleton ------------------------------- */

function StandupSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
        <div className="flex flex-col gap-4">
          <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
