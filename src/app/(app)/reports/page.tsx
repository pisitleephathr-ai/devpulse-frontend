"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import Link from "next/link";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  FileText,
  Download,
  CalendarDays,
  TriangleAlert,
  RefreshCw,
  ListChecks,
  CheckCircle2,
  Clock,
  Users,
  Target,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/filter-bar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportForm } from "@/components/forms/report-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { SearchInput } from "@/components/search-input";
import { matchesSearch } from "@/lib/filters";
import { downloadExcel, todayStamp } from "@/lib/excel";
import { bangkokDateISO, thaiDateShortFromISO } from "@/lib/thai-datetime";
import { REPORT_STATUS_OPTIONS, type Report, type RelatedTask } from "@/lib/mock-data";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function isoToThai(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Placeholders that mean "no blocker" — used to mute/hide the blocker box. */
const NO_BLOCKER = new Set(["", "ไม่มี", "—", "-", "วันนี้ไม่มี", "ไม่มีครับ", "ไม่มีค่ะ"]);
function hasBlocker(s: string) {
  return !NO_BLOCKER.has((s ?? "").trim());
}

export default function ReportsPage() {
  const {
    reports,
    users,
    projects,
    addReport,
    updateReport,
    deleteReport,
    loading,
    error,
    refresh,
    reportsHasMore,
    loadingMoreReports,
    loadMoreReports,
  } = useData();
  const me = useCurrentUser();
  const canEditReport = (r: Report) =>
    isManagerOrAdmin(me) || (!!me && r.key === me.avatarKey);

  // Default the date filter to today's Bangkok date (reduces noise on open).
  const [search, setSearch] = usePersistedState("reports.search", "");
  // Date is intentionally NOT persisted — it should default to today each visit.
  const [date, setDate] = useState(() => bangkokDateISO());
  const [member, setMember] = usePersistedState("reports.member", "all");
  const [project, setProject] = usePersistedState("reports.project", "all");
  const [status, setStatus] = usePersistedState("reports.status", "all");

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Report | null>(null);

  const isToday = date === bangkokDateISO();
  const filtersActive =
    !!search || !!date || member !== "all" || project !== "all" || status !== "all";

  // "Haven't reported today" nudge — reliable since today's reports (newest)
  // are always on the first loaded page.
  const meUser = users.find((u) => u.key === me?.avatarKey);
  const todayThai = isoToThai(bangkokDateISO());
  const submittedToday =
    !!me &&
    reports.some(
      (r) => r.key === me.avatarKey && r.date === todayThai && r.status !== "ฉบับร่าง"
    );
  const needsReportToday =
    !!me && (meUser?.requiresDailyReport ?? true) && !submittedToday;

  // Role display name by avatar key (report data has no role of its own).
  const roleByKey = useMemo(
    () => new Map(users.map((u) => [u.key, u.role])),
    [users]
  );

  const filtered = useMemo(() => {
    const dateLabel = date ? isoToThai(date) : null;
    return reports.filter(
      (r) =>
        matchesSearch([r.did, r.plan, r.blockers, r.summary, r.name, r.proj], search) &&
        (!dateLabel || r.date === dateLabel) &&
        (member === "all" || r.name === member) &&
        (project === "all" || r.proj === project) &&
        (status === "all" || r.status === status)
    );
  }, [reports, search, date, member, project, status]);

  // Submission overview for the selected day (managers care who's behind).
  const overview = useMemo(() => {
    const requiredUsers = users.filter((u) => u.requiresDailyReport ?? true);
    const submittedKeys = new Set(
      filtered.filter((r) => r.status !== "ฉบับร่าง").map((r) => r.key)
    );
    const missing = date
      ? requiredUsers.filter((u) => !submittedKeys.has(u.key))
      : [];
    return {
      total: filtered.length,
      submitters: submittedKeys.size,
      required: requiredUsers.length,
      missing,
      blockers: filtered.filter((r) => hasBlocker(r.blockers)).length,
    };
  }, [filtered, users, date]);

  function clearFilters() {
    // Product rule: Clear shows ALL reports (does not return to today).
    setSearch("");
    setDate("");
    setMember("all");
    setProject("all");
    setStatus("all");
  }

  function exportExcel() {
    downloadExcel(
      `daily-reports-${todayStamp()}.xls`,
      ["วันที่", "ผู้เขียน", "โปรเจกต์", "สิ่งที่ทำ", "แผนถัดไป", "อุปสรรค", "สถานะ"],
      filtered.map((r) => [r.date, r.name, r.proj, r.did, r.plan, r.blockers, r.status]),
      "รายงานประจำวัน"
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            DAILY REPORTS
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            รายงานประจำวัน
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {isToday
              ? "อัปเดตความคืบหน้าของทีมวันนี้"
              : date
                ? `รายงานวันที่ ${thaiDateShortFromISO(date)}`
                : "รายงานทั้งหมดของทีม"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200"
          >
            <Download className="size-3.5" />
            ส่งออก Excel
          </button>
          <button onClick={() => setCreating(true)} className={buttonVariants()}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            สร้างรายงาน
          </button>
        </div>
      </div>

      {/* Submission overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<CheckCircle2 className="size-4" />}
          tone="teal"
          label={date ? "ส่งแล้ว" : "รายงานทั้งหมด"}
          value={date ? `${overview.submitters}/${overview.required}` : String(overview.total)}
          sub={date ? "คน" : "ฉบับ"}
        />
        <StatTile
          icon={<Clock className="size-4" />}
          tone={date && overview.missing.length ? "amber" : "zinc"}
          label="ยังไม่ส่ง"
          value={date ? String(overview.missing.length) : "—"}
          sub={date ? "คน" : "เลือกวันเพื่อดู"}
        />
        <StatTile
          icon={<TriangleAlert className="size-4" />}
          tone={overview.blockers ? "red" : "zinc"}
          label="มีอุปสรรค"
          value={String(overview.blockers)}
          sub="ฉบับ"
        />
        <StatTile
          icon={date ? <Target className="size-4" /> : <Users className="size-4" />}
          tone="zinc"
          label={date ? "อัตราการส่ง" : "ผู้ส่งรายงาน"}
          value={
            date
              ? overview.required
                ? `${Math.round((overview.submitters / overview.required) * 100)}%`
                : "—"
              : String(overview.submitters)
          }
          sub={date ? "ของทีม" : "คน"}
        />
      </div>

      {/* Who hasn't submitted (for the selected day) */}
      {date && overview.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="size-3.5" /> ยังไม่ส่ง
          </span>
          {overview.missing.slice(0, 12).map((u) => (
            <span
              key={u.id}
              className="rounded-full bg-white/70 px-2 py-0.5 text-[11.5px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
            >
              {u.name}
            </span>
          ))}
          {overview.missing.length > 12 && (
            <span className="text-[11.5px] font-medium text-amber-700/80">
              +{overview.missing.length - 12}
            </span>
          )}
        </div>
      )}

      {needsReportToday && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-[13px] font-medium text-amber-800 dark:text-amber-200">
            <TriangleAlert className="size-4 flex-none" />
            คุณยังไม่ได้ส่งรายงานประจำวันนี้
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex-none rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-amber-700"
          >
            ส่งรายงาน
          </button>
        </div>
      )}

      <FilterBar trailing={`${filtered.length} รายงาน`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหางาน แผน อุปสรรค…"
        />
        {/* วันนี้ / ทั้งหมด quick toggles */}
        <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200">
          <button
            onClick={() => setDate(bangkokDateISO())}
            className={`px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${
              isToday ? "bg-teal-600 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => setDate("")}
            className={`border-l border-zinc-200 px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${
              !date ? "bg-teal-600 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            ทั้งหมด
          </button>
        </div>
        {me && (
          <button
            onClick={() => setMember(member === me.name ? "all" : me.name)}
            className={`rounded-lg border px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${
              member === me.name
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            ของฉัน
          </button>
        )}
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto py-[7px] text-[12.5px] text-zinc-700"
        />
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={member}
          onChange={(e) => setMember(e.target.value)}
        >
          <option value="all">สมาชิกทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="all">โปรเจกต์ทั้งหมด</option>
          {projects.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          {REPORT_STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <X className="size-3" />
            ล้างตัวกรอง
          </button>
        )}
      </FilterBar>

      {/* Active-date hint chip */}
      {date && (
        <div className="flex items-center gap-2 text-[12.5px] text-zinc-500">
          <CalendarDays className="size-3.5 text-teal-600" />
          {isToday ? "กำลังแสดงรายงานของวันนี้ · " : "วันที่: "}
          <span className="font-medium text-zinc-700">{thaiDateShortFromISO(date)}</span>
        </div>
      )}

      {/* States */}
      {loading && reports.length === 0 ? (
        <CardGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </CardGrid>
      ) : error && reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12">
          <span className="text-[13px] text-red-800">โหลดรายงานไม่สำเร็จ</span>
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="size-3.5" />
            ลองใหม่
          </button>
        </div>
      ) : filtered.length === 0 ? (
        reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="ยังไม่มีรายงาน"
            description="สร้างรายงานประจำวันฉบับแรก"
          />
        ) : isToday && !search && member === "all" && project === "all" && status === "all" ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <CalendarDays className="size-5" />
            </span>
            <div className="text-[14px] font-semibold">ยังไม่มีรายงานสำหรับวันนี้</div>
            <p className="text-[12.5px] text-zinc-500">เลือกดูวันอื่น หรือดูรายงานทั้งหมด</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDate("")}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100"
              >
                ดูทั้งหมด
              </button>
              <Link href="/reports/new" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-3.5" />
                เขียนรายงานวันนี้
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="ไม่พบรายงาน"
            description="ลองปรับตัวกรอง"
          />
        )
      ) : (
        <CardGrid>
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              role={roleByKey.get(r.key)}
              canEdit={canEditReport(r)}
              onView={() => setViewing(r)}
              onEdit={() => setEditing(r)}
              onDelete={() => setPendingDelete(r)}
            />
          ))}
        </CardGrid>
      )}

      {reportsHasMore && !loading && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => loadMoreReports()}
            disabled={loadingMoreReports}
            className="rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200"
          >
            {loadingMoreReports ? "กำลังโหลด…" : "โหลดเพิ่ม"}
          </button>
        </div>
      )}

      {/* Create */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="สร้างรายงานประจำวัน"
        description="ใช้เวลาประมาณ 2 นาที · หัวหน้าทีมอ่านรายงานเหล่านี้ทุกเช้า"
      >
        {creating && (
          <ReportForm
            mode="create"
            onSubmit={async (data) => {
              const ok = await addReport(data);
              if (ok) {
                setCreating(false);
                toast(data.status === "DRAFT" ? "บันทึกฉบับร่างแล้ว" : "ส่งรายงานแล้ว");
              }
              return ok;
            }}
            onCancel={() => setCreating(false)}
          />
        )}
      </Dialog>

      {/* View */}
      {viewing && <ReportModal report={viewing} onClose={() => setViewing(null)} />}

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="แก้ไขรายงาน"
        description={editing ? `${editing.name} · ${editing.date}` : undefined}
      >
        {editing && (
          <ReportForm
            mode="edit"
            report={editing}
            onSubmit={async (data) => {
              const ok = await updateReport(editing.id, data);
              if (ok) {
                setEditing(null);
                toast("บันทึกการแก้ไขรายงานแล้ว");
              }
              return ok;
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete && (await deleteReport(pendingDelete.id))) {
            toast("ลบรายงานแล้ว");
          }
        }}
        title="ลบรายงานนี้?"
        message={`ต้องการลบรายงานของ ${pendingDelete?.name} (${pendingDelete?.date}) ใช่หรือไม่`}
        confirmLabel="ลบรายงาน"
        destructive
      />
    </div>
  );
}

/* -------------------------------- Stat tile ----------------------------- */

const STAT_TONES: Record<string, string> = {
  teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400",
  amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
  red: "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400",
  zinc: "text-zinc-500 bg-muted dark:text-zinc-400",
};

function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "teal" | "amber" | "red" | "zinc";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <span className={`flex size-9 flex-none items-center justify-center rounded-lg ${STAT_TONES[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[19px] font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </span>
          {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Card grid ------------------------------ */

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
  );
}

function ReportCard({
  report: r,
  role,
  canEdit,
  onView,
  onEdit,
  onDelete,
}: {
  report: Report;
  role?: string;
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const blocker = hasBlocker(r.blockers);
  const longContent =
    (r.did?.length ?? 0) + (r.plan?.length ?? 0) + (r.blockers?.length ?? 0) > 320;

  return (
    <article className="dp-card-hover flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
        <Avatar userKey={r.key} size={36} fontSize={13.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold">{r.name}</span>
            {role && (
              <span className="flex-none rounded-[5px] bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground">
                {role}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="truncate font-medium text-zinc-500 dark:text-zinc-400">{r.proj}</span>
            <span className="size-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="flex-none">{r.date}</span>
          </div>
        </div>
        <StatusBadge label={r.status} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3.5 px-4 py-4">
        {r.summary?.trim() && r.summary.trim() !== r.did?.trim() && (
          <p className="text-[13.5px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">
            {r.summary}
          </p>
        )}
        <CardSection
          label="งานที่ทำล่าสุด"
          text={r.did}
          clamp={!expanded}
          accent="#0d9488"
          icon={<CheckCircle2 className="size-3" />}
        />
        <CardSection
          label="แผนงานวันนี้"
          text={r.plan}
          clamp={!expanded}
          accent="#2563eb"
          icon={<Target className="size-3" />}
        />
        <CardSection
          label="ปัญหา / อุปสรรค"
          text={r.blockers}
          clamp={!expanded}
          accent="#f59e0b"
          highlight={blocker}
        />
        {longContent && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="self-start text-[12px] font-medium text-teal-600 hover:underline"
          >
            {expanded ? "ย่อลง" : "ดูเพิ่มเติม"}
          </button>
        )}
        <RelatedTasksRow tasks={r.relatedTasks ?? []} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 border-t border-hairline px-4 py-2.5">
        <button
          onClick={onView}
          className="rounded-[7px] border border-zinc-200 px-2.5 py-1 text-[12.5px] font-medium text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50"
        >
          ดูรายละเอียด
        </button>
        {canEdit && (
          <>
            <button
              onClick={onEdit}
              className="flex size-[28px] items-center justify-center rounded-[7px] border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100"
              aria-label="แก้ไข"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="flex size-[28px] items-center justify-center rounded-[7px] border border-zinc-200 text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
              aria-label="ลบ"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function CardSection({
  label,
  text,
  clamp,
  accent,
  highlight,
  icon,
}: {
  label: string;
  text: string;
  clamp: boolean;
  accent: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  const isEmpty = !text?.trim();

  return (
    <div
      className={
        highlight
          ? "rounded-r-lg border-l-[3px] border-amber-400 bg-amber-50 py-2 pl-3 pr-3 dark:bg-amber-950/25"
          : "border-l-[3px] pl-3"
      }
      style={highlight ? undefined : { borderColor: accent }}
    >
      <div
        className={`mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] ${
          highlight ? "text-amber-700 dark:text-amber-400" : ""
        }`}
        style={highlight ? undefined : { color: accent }}
      >
        {highlight ? <TriangleAlert className="size-3" /> : icon}
        {label}
      </div>
      {isEmpty ? (
        <p className="text-[13px] italic text-zinc-300 dark:text-zinc-600">—</p>
      ) : (
        <p
          className={`whitespace-pre-line text-[13px] leading-relaxed ${
            highlight ? "text-amber-900 dark:text-amber-100" : "text-zinc-700 dark:text-zinc-200"
          } ${clamp ? "line-clamp-4" : ""}`}
        >
          {text}
        </p>
      )}
    </div>
  );
}

/** Compact linked-task strip for a report card — shows a few, then "+N". */
function RelatedTasksRow({ tasks, max = 3 }: { tasks: RelatedTask[]; max?: number }) {
  if (!tasks.length) return null;
  const shown = tasks.slice(0, max);
  const extra = tasks.length - shown.length;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
      <span className="flex flex-none items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
        <ListChecks className="size-3" />
        งานที่เกี่ยวข้อง
      </span>
      {shown.map((t) => (
        <span
          key={t.id}
          className="inline-flex max-w-[170px] items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300"
          title={t.title}
        >
          <span
            className="flex-none font-mono text-[9.5px] font-semibold"
            style={{ color: t.projColor }}
          >
            {t.proj}
          </span>
          <span className="truncate">{t.title}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="flex-none text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          +{extra} เพิ่มเติม
        </span>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2.5">
        <div className="size-9 animate-pulse rounded-full bg-zinc-100" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-2.5 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

/* ------------------------------ Detail modal ---------------------------- */

function ReportModal({
  report,
  onClose,
}: {
  report: Report;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      onMouseDown={onClose}
      className="dp-scrim fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className="dp-pop max-h-[85vh] w-[560px] max-w-full overflow-hidden rounded-[14px] bg-card shadow-[0_20px_50px_rgba(0,0,0,0.2)] outline-none"
      >
        <div className="flex items-center gap-[11px] border-b border-hairline px-[22px] py-[18px]">
          <Avatar userKey={report.key} size={30} fontSize={11} />
          <div className="flex-1">
            <div id={titleId} className="text-[14px] font-semibold">{report.name}</div>
            <div className="text-xs text-muted-foreground">
              {report.proj} · {report.date}
            </div>
          </div>
          <StatusBadge label={report.status} />
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[7px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex max-h-[calc(85vh-72px)] flex-col gap-4 overflow-y-auto px-[22px] py-5">
          <Section label="งานที่ทำ" text={report.did} />
          <Section label="ปัญหา / อุปสรรค" text={report.blockers} highlight={hasBlocker(report.blockers)} />
          <Section label="แผนงาน" text={report.plan} />
          {report.relatedTasks && report.relatedTasks.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground">
                <ListChecks className="size-3" />
                งานที่เกี่ยวข้อง ({report.relatedTasks.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.relatedTasks.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[12px] text-zinc-700 dark:text-zinc-200"
                    title={t.title}
                  >
                    <span
                      className="flex-none font-mono text-[10px] font-semibold"
                      style={{ color: t.projColor }}
                    >
                      {t.proj}
                    </span>
                    <span className="max-w-[220px] truncate">{t.title}</span>
                    <span className="flex-none text-[10.5px] text-muted-foreground">{t.status}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  text,
  highlight,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/25" : ""}>
      <div
        className={`mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] ${
          highlight ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
        }`}
      >
        {highlight && <TriangleAlert className="size-3" />}
        {label}
      </div>
      {text?.trim() ? (
        <div
          className={`whitespace-pre-line text-[13px] leading-relaxed ${
            highlight ? "text-amber-900 dark:text-amber-100" : "text-zinc-700 dark:text-zinc-200"
          }`}
        >
          {text}
        </div>
      ) : (
        <div className="text-[13px] italic text-zinc-300 dark:text-zinc-600">—</div>
      )}
    </div>
  );
}
