"use client";

import { useMemo, useState } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import { Plus, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveForm } from "@/components/forms/leave-form";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { DataTable, DataTableRow } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { TableRowsSkeleton } from "@/components/skeletons";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import {
  LEAVE_TYPE_COLORS,
  LEAVE_STATUS_OPTIONS,
  type Leave,
} from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { canApproveLeave } from "@/lib/permissions";
import { SearchInput } from "@/components/search-input";
import { matchesSearch } from "@/lib/filters";
import { X } from "lucide-react";

const TEMPLATE = "160px 96px 150px 92px minmax(170px,1fr) 104px 172px";

export default function LeavesPage() {
  const { leaves, users, loading, setLeaveStatus, addLeave, leaveTypes } = useData();
  // Filter options from the configured leave types (active, sorted).
  const typeOptions = useMemo(
    () =>
      leaveTypes
        .filter((t) => t.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => t.name),
    [leaveTypes]
  );
  // Badge colors: prefer the built-in palette, then the configured policy color
  // (as a light tint + solid), then a neutral fallback.
  const policyColor = useMemo(
    () => new Map(leaveTypes.map((t) => [t.name, t.color])),
    [leaveTypes]
  );
  const typeColors = (name: string): [string, string] => {
    if (LEAVE_TYPE_COLORS[name]) return LEAVE_TYPE_COLORS[name];
    const hex = policyColor.get(name);
    if (hex) return [`${hex}22`, hex];
    return ["#e4e4e7", "#3f3f46"];
  };
  const me = useCurrentUser();
  // Anyone with approval rights can decide any pending leave — including their own.
  const canApprove = canApproveLeave(me);
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = usePersistedState("leaves.search", "");
  const [member, setMember] = usePersistedState("leaves.member", "all");
  const [type, setType] = usePersistedState("leaves.type", "all");
  const [status, setStatus] = usePersistedState("leaves.status", "all");
  const [viewing, setViewing] = useState<Leave | null>(null);

  const filtersActive =
    !!search || member !== "all" || type !== "all" || status !== "all";

  const filtered = useMemo(
    () =>
      leaves.filter(
        (l) =>
          matchesSearch([l.name, l.reason, l.type], search) &&
          (member === "all" || l.name === member) &&
          (type === "all" || l.type === type) &&
          (status === "all" || l.status === status)
      ),
    [leaves, search, member, type, status]
  );

  function clearFilters() {
    setSearch("");
    setMember("all");
    setType("all");
    setStatus("all");
  }

  function decide(l: Leave, next: "อนุมัติแล้ว" | "ปฏิเสธ") {
    setLeaveStatus(l.id, next);
    const verb = next === "อนุมัติแล้ว" ? "อนุมัติ" : "ปฏิเสธ";
    toast(`${verb}คำขอ${l.type}ของ${l.name.split(" ")[0]}แล้ว`);
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="LEAVE REQUESTS"
        title="คำขอลา"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            ขอลา
          </Button>
        }
      />

      <FilterBar trailing={`${filtered.length} คำขอ`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ เหตุผล…"
        />
        {/* Member filter only for approvers — others see just their own leaves. */}
        {canApprove && (
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
        )}
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">ประเภททั้งหมด</option>
          {typeOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          {LEAVE_STATUS_OPTIONS.map((s) => (
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

      {loading && leaves.length === 0 ? (
        <TableRowsSkeleton rows={6} />
      ) : (
      <DataTable
        template={TEMPLATE}
        minWidth={1000}
        headers={[
          "สมาชิก",
          "ประเภท",
          "วันที่",
          "จำนวนวัน",
          "เหตุผล",
          "สถานะ",
          "",
        ]}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-5" />}
            title="ไม่พบคำขอลา"
            description="ลองปรับตัวกรอง หรือสร้างคำขอใหม่"
          />
        ) : (
          filtered.map((l) => (
            <DataTableRow key={l.id}>
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar userKey={l.key} size={24} fontSize={9.5} />
                <span className="truncate text-[13px] font-medium">
                  {l.name}
                </span>
              </div>
              <span className="justify-self-start">
                <StatusBadge
                  label={l.type}
                  colors={typeColors(l.type)}
                  shape="tag"
                />
              </span>
              <span className="text-[12.5px] text-zinc-700">{l.dates}</span>
              <span className="flex flex-col items-start gap-1 text-[12.5px] text-zinc-500">
                <span className="whitespace-nowrap">{l.days} วัน</span>
                {l.halfDayPeriod ? (
                  <span className="whitespace-nowrap rounded-[4px] bg-amber-50 px-1.5 py-px text-[10.5px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {l.halfDayPeriod === "MORNING" ? "ครึ่งเช้า" : "ครึ่งบ่าย"}
                  </span>
                ) : null}
              </span>
              <span className="truncate text-[12.5px] text-zinc-500">
                {l.reason}
              </span>
              <span>
                <StatusBadge label={l.status} />
              </span>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setViewing(l)}
                  className="rounded-[7px] border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50"
                >
                  ดู
                </button>
                {canApprove && l.status === "รออนุมัติ" && (
                  <>
                    <button
                      onClick={() => decide(l, "อนุมัติแล้ว")}
                      className="rounded-[7px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                    >
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => decide(l, "ปฏิเสธ")}
                      className="rounded-[7px] border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:border-red-200 hover:bg-red-50"
                    >
                      ปฏิเสธ
                    </button>
                  </>
                )}
              </div>
            </DataTableRow>
          ))
        )}
      </DataTable>
      )}

      {/* View detail */}
      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="รายละเอียดคำขอลา"
        footer={
          viewing && canApprove && viewing.status === "รออนุมัติ" ? (
            <>
              <button
                onClick={() => {
                  decide(viewing, "ปฏิเสธ");
                  setViewing(null);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-200 hover:bg-red-50"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={() => {
                  decide(viewing, "อนุมัติแล้ว");
                  setViewing(null);
                }}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-700 transition-colors hover:bg-green-100"
              >
                อนุมัติ
              </button>
            </>
          ) : null
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar userKey={viewing.key} size={34} fontSize={12} />
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{viewing.name}</div>
                <div className="text-xs text-zinc-400">{viewing.dates}</div>
              </div>
              <StatusBadge label={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="ประเภท">
                <StatusBadge
                  label={viewing.type}
                  colors={LEAVE_TYPE_COLORS[viewing.type]}
                  shape="tag"
                />
              </DetailField>
              <DetailField label="จำนวนวัน">
                <span className="text-[13px]">
                  {viewing.days} วัน
                  {viewing.halfDayPeriod
                    ? ` (${viewing.halfDayPeriod === "MORNING" ? "ครึ่งวันเช้า" : "ครึ่งวันบ่าย"})`
                    : ""}
                </span>
              </DetailField>
            </div>
            <DetailField label="เหตุผล">
              <p className="text-[13px] leading-relaxed text-zinc-700">
                {viewing.reason}
              </p>
            </DetailField>
          </div>
        )}
      </Dialog>

      {/* Create leave request */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="ขอลา"
        description="ส่งคำขอลาให้หัวหน้าทีมพิจารณา"
      >
        {creating && (
          <LeaveForm
            onSubmit={async (data) => {
              const ok = await addLeave(data);
              if (ok) {
                setCreating(false);
                toast("ส่งคำขอลาแล้ว — รอการอนุมัติ");
              }
            }}
            onCancel={() => setCreating(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}
