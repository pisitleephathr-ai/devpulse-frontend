"use client";

import { useEffect, useMemo, useState } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import { Plus, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaveForm } from "@/components/forms/leave-form";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { DataTable, DataTableRow } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { TableRowsSkeleton } from "@/components/skeletons";
import { useData } from "@/lib/store";
import { LEAVE_STATUS_OPTIONS, type Leave } from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { bangkokDateISO } from "@/lib/thai-datetime";
import { SearchInput } from "@/components/search-input";
import { matchesSearch } from "@/lib/filters";

const TEMPLATE = "180px 160px 96px minmax(180px,1fr) 110px 132px";

export default function LeavesPage() {
  const { leaves, users, loading, cancelLeave, addLeave } = useData();
  const me = useCurrentUser();
  // Managers/admins see everyone's declarations → offer the member filter.
  const isManager = isManagerOrAdmin(me);

  // You may cancel only your OWN active declaration, and only before its start
  // date (once the day arrives it can't be undone).
  const canCancel = (l: Leave) =>
    !!me &&
    l.userId === me.id &&
    l.status === "ติดธุระ" &&
    bangkokDateISO() < l.startDate.slice(0, 10);

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Leave | null>(null);
  const [cancelling, setCancelling] = useState<Leave | null>(null);

  // Open the create modal when arriving via ?new=1 (e.g. the dashboard shortcut).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreating(true);
    }
  }, []);

  const [search, setSearch] = usePersistedState("leaves.search", "");
  const [member, setMember] = usePersistedState("leaves.member", "all");
  const [status, setStatus] = usePersistedState("leaves.status", "all");

  const filtersActive = !!search || member !== "all" || status !== "all";

  const filtered = useMemo(
    () =>
      leaves.filter(
        (l) =>
          matchesSearch([l.name, l.reason], search) &&
          (member === "all" || l.name === member) &&
          (status === "all" || l.status === status)
      ),
    [leaves, search, member, status]
  );

  function clearFilters() {
    setSearch("");
    setMember("all");
    setStatus("all");
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="BUSY / OUT OF OFFICE"
        title="แจ้งติดธุระ"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            แจ้งติดธุระ
          </Button>
        }
      />

      <FilterBar trailing={`${filtered.length} รายการ`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ เหตุผล…"
        />
        {/* Member filter only for managers — others see just their own. */}
        {isManager && (
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
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
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
        minWidth={860}
        headers={["สมาชิก", "วันที่", "จำนวนวัน", "เหตุผล", "สถานะ", ""]}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-5" />}
            title="ยังไม่มีการแจ้งติดธุระ"
            description="ลองปรับตัวกรอง หรือแจ้งติดธุระใหม่"
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
              <span className="text-[12.5px] text-zinc-700 dark:text-zinc-300">{l.dates}</span>
              <span className="flex flex-col items-start gap-1 text-[12.5px] text-zinc-500">
                <span className="whitespace-nowrap">{l.days} วัน</span>
                {l.halfDayPeriod ? (
                  <span className="whitespace-nowrap rounded-[4px] bg-amber-50 px-1.5 py-px text-[10.5px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {l.halfDayPeriod === "MORNING" ? "ครึ่งเช้า" : "ครึ่งบ่าย"}
                  </span>
                ) : null}
              </span>
              <span className="truncate text-[12.5px] text-zinc-500">
                {l.reason || "—"}
              </span>
              <span>
                <StatusBadge label={l.status} />
              </span>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setViewing(l)}
                  className="rounded-[7px] border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 dark:border-zinc-700 dark:hover:bg-teal-500/10"
                >
                  ดู
                </button>
                {canCancel(l) && (
                  <button
                    onClick={() => setCancelling(l)}
                    className="rounded-[7px] border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-zinc-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    ยกเลิก
                  </button>
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
        title="รายละเอียดการแจ้งติดธุระ"
        footer={
          viewing && canCancel(viewing) ? (
            <button
              onClick={() => {
                setCancelling(viewing);
                setViewing(null);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-zinc-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
            >
              ยกเลิกติดธุระ
            </button>
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
            <DetailField label="จำนวนวัน">
              <span className="text-[13px]">
                {viewing.days} วัน
                {viewing.halfDayPeriod
                  ? ` (${viewing.halfDayPeriod === "MORNING" ? "ครึ่งวันเช้า" : "ครึ่งวันบ่าย"})`
                  : ""}
              </span>
            </DetailField>
            <DetailField label="เหตุผล">
              <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {viewing.reason || "—"}
              </p>
            </DetailField>
          </div>
        )}
      </Dialog>

      {/* Self-cancel confirmation */}
      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={async () => {
          if (cancelling) await cancelLeave(cancelling.id);
          setCancelling(null);
        }}
        title="ยกเลิกติดธุระ?"
        message={
          cancelling
            ? `ยกเลิกการแจ้งติดธุระวันที่ ${cancelling.dates}? หลังถึงวันเริ่มแล้วจะยกเลิกไม่ได้`
            : ""
        }
        confirmLabel="ยกเลิกติดธุระ"
        cancelLabel="ปิด"
        destructive
      />

      {/* New busy declaration */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="แจ้งติดธุระ"
        description="แจ้งวันที่คุณติดธุระให้ทีมทราบ — มีผลทันที ไม่ต้องรออนุมัติ"
      >
        {creating && (
          <LeaveForm
            onSubmit={async (data) => {
              const ok = await addLeave(data);
              // Success toast is emitted by the store.
              if (ok) setCreating(false);
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
