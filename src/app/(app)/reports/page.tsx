"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X, Pencil, Trash2, FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { DataTable, DataTableRow } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportForm } from "@/components/forms/report-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import {
  PROJECTS,
  REPORT_STATUS_OPTIONS,
  TEAM_MEMBERS,
  type Report,
} from "@/lib/mock-data";

const TEMPLATE = "80px 160px 130px minmax(200px,1fr) 96px 128px";
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function isoToThai(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export default function ReportsPage() {
  const { reports, updateReport, deleteReport } = useData();

  const [date, setDate] = useState("");
  const [member, setMember] = useState("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");

  const [viewing, setViewing] = useState<Report | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Report | null>(null);

  const filtered = useMemo(() => {
    const dateLabel = date ? isoToThai(date) : null;
    return reports.filter(
      (r) =>
        (!dateLabel || r.date === dateLabel) &&
        (member === "all" || r.name === member) &&
        (project === "all" || r.proj === project) &&
        (status === "all" || r.status === status)
    );
  }, [reports, date, member, project, status]);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="DAILY REPORTS"
        title="รายงานประจำวัน"
        actions={
          <Link href="/reports/new" className={buttonVariants()}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            สร้างรายงาน
          </Link>
        }
      />

      <FilterBar trailing={`${filtered.length} รายงาน`}>
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
          {TEAM_MEMBERS.map((m) => (
            <option key={m.key} value={m.name}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="all">โปรเจกต์ทั้งหมด</option>
          {PROJECTS.map((p) => (
            <option key={p}>{p}</option>
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
      </FilterBar>

      <DataTable
        template={TEMPLATE}
        minWidth={880}
        headers={["วันที่", "สมาชิก", "โปรเจกต์", "สรุป", "สถานะ", ""]}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="ไม่พบรายงาน"
            description="ลองปรับตัวกรอง หรือสร้างรายงานใหม่"
          />
        ) : (
          filtered.map((r) => (
            <DataTableRow key={r.id}>
              <span className="text-[12.5px] text-zinc-500">{r.date}</span>
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar userKey={r.key} size={24} fontSize={9.5} />
                <span className="truncate text-[13px] font-medium">
                  {r.name}
                </span>
              </div>
              <span className="text-[12.5px] text-zinc-700">{r.proj}</span>
              <span className="truncate text-[12.5px] text-zinc-500">
                {r.summary}
              </span>
              <span>
                <StatusBadge label={r.status} />
              </span>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setViewing(r)}
                  className="rounded-[7px] border border-zinc-200 px-2.5 py-1 text-[12.5px] font-medium text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50"
                >
                  ดู
                </button>
                <button
                  onClick={() => setEditing(r)}
                  className="flex size-[26px] items-center justify-center rounded-[7px] border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100"
                  aria-label="แก้ไข"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setPendingDelete(r)}
                  className="flex size-[26px] items-center justify-center rounded-[7px] border border-zinc-200 text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                  aria-label="ลบ"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </DataTableRow>
          ))
        )}
      </DataTable>

      {/* View */}
      {viewing && (
        <ReportModal report={viewing} onClose={() => setViewing(null)} />
      )}

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
        className="w-[560px] max-w-full overflow-hidden rounded-[14px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
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
        <div className="flex flex-col gap-4 px-[22px] py-5">
          <Section label="TODAY" text={report.did} />
          <Section label="BLOCKERS" text={report.blockers} />
          <Section label="TOMORROW" text={report.plan} />
        </div>
      </div>
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-zinc-500">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed text-zinc-700">{text}</div>
    </div>
  );
}
