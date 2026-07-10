"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
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
import { downloadCsv, todayStamp } from "@/lib/csv";
import { bangkokDateISO, thaiDateShortFromISO } from "@/lib/thai-datetime";
import { REPORT_STATUS_OPTIONS, type Report } from "@/lib/mock-data";

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
  const { reports, users, projects, addReport, updateReport, deleteReport, loading, error, refresh } =
    useData();
  const me = useCurrentUser();
  const canEditReport = (r: Report) =>
    isManagerOrAdmin(me) || (!!me && r.key === me.avatarKey);

  // Default the date filter to today's Bangkok date (reduces noise on open).
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => bangkokDateISO());
  const [member, setMember] = useState("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Report | null>(null);

  const isToday = date === bangkokDateISO();
  const filtersActive =
    !!search || !!date || member !== "all" || project !== "all" || status !== "all";

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

  function clearFilters() {
    // Product rule: Clear shows ALL reports (does not return to today).
    setSearch("");
    setDate("");
    setMember("all");
    setProject("all");
    setStatus("all");
  }

  function exportCsv() {
    downloadCsv(
      `daily-reports-${todayStamp()}.csv`,
      ["วันที่", "ผู้เขียน", "โปรเจกต์", "สิ่งที่ทำ", "แผนถัดไป", "อุปสรรค", "สถานะ"],
      filtered.map((r) => [r.date, r.name, r.proj, r.did, r.plan, r.blockers, r.status])
    );
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="DAILY REPORTS"
        title="รายงานประจำวัน"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3.5" />
              ส่งออก CSV
            </button>
            <button onClick={() => setCreating(true)} className={buttonVariants()}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              สร้างรายงาน
            </button>
          </div>
        }
      />

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
            onSubmit={(data) => {
              addReport(data);
              setCreating(false);
              toast(data.status === "DRAFT" ? "บันทึกฉบับร่างแล้ว" : "ส่งรายงานแล้ว");
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
            onSubmit={(data) => {
              updateReport(editing.id, data);
              setEditing(null);
              toast("บันทึกการแก้ไขรายงานแล้ว");
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteReport(pendingDelete.id);
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

/* ------------------------------- Card grid ------------------------------ */

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
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
    <article className="dp-card-hover flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
        <CardSection label="งานที่ทำเมื่อวาน" text={r.did} clamp={!expanded} accent="#0d9488" />
        <CardSection label="แผนงานวันนี้" text={r.plan} clamp={!expanded} accent="#2563eb" />
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
}: {
  label: string;
  text: string;
  clamp: boolean;
  accent: string;
  highlight?: boolean;
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
        {highlight && <TriangleAlert className="size-3" />}
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
  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-[560px] max-w-full overflow-hidden rounded-[14px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center gap-[11px] border-b border-hairline px-[22px] py-[18px]">
          <Avatar userKey={report.key} size={30} fontSize={11} />
          <div className="flex-1">
            <div className="text-[14px] font-semibold">{report.name}</div>
            <div className="text-xs text-zinc-400">
              {report.proj} · {report.date}
            </div>
          </div>
          <StatusBadge label={report.status} />
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[7px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex max-h-[calc(85vh-72px)] flex-col gap-4 overflow-y-auto px-[22px] py-5">
          <Section label="งานที่ทำ" text={report.did} />
          <Section label="ปัญหา / อุปสรรค" text={report.blockers} highlight={hasBlocker(report.blockers)} />
          <Section label="แผนงาน" text={report.plan} />
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
    <div className={highlight ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5" : ""}>
      <div
        className={`mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] ${
          highlight ? "text-amber-700" : "text-zinc-500"
        }`}
      >
        {highlight && <TriangleAlert className="size-3" />}
        {label}
      </div>
      {text?.trim() ? (
        <div
          className={`whitespace-pre-line text-[13px] leading-relaxed ${
            highlight ? "text-amber-900" : "text-zinc-700"
          }`}
        >
          {text}
        </div>
      ) : (
        <div className="text-[13px] italic text-zinc-300">—</div>
      )}
    </div>
  );
}
