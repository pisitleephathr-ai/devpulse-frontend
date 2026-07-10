"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, X, RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api";
import { useData } from "@/lib/store";
import { relativeTimeTh } from "@/lib/utils";
import type { ApiActivity } from "@/lib/mappers";

/** Human labels + colours for known action keys. */
const ACTION_META: Record<string, { label: string; color: string }> = {
  "task.create": { label: "สร้างงาน", color: "#3b82f6" },
  "task.update": { label: "แก้ไขงาน", color: "#3b82f6" },
  "task.status": { label: "ย้ายสถานะงาน", color: "#7c3aed" },
  "report.create": { label: "ส่งรายงาน", color: "#0d9488" },
  "report.update": { label: "แก้ไขรายงาน", color: "#0d9488" },
  "leave.create": { label: "ขอลา", color: "#f59e0b" },
  "leave.approve": { label: "อนุมัติลา", color: "#10b981" },
  "leave.reject": { label: "ปฏิเสธลา", color: "#e11d48" },
  "user.create": { label: "เพิ่มผู้ใช้", color: "#3b82f6" },
  "user.update": { label: "แก้ไขผู้ใช้", color: "#3b82f6" },
  "user.toggleActive": { label: "เปิด/ปิดผู้ใช้", color: "#6366f1" },
  "profile.update": { label: "อัปเดตโปรไฟล์", color: "#a1a1aa" },
  "password.change": { label: "เปลี่ยนรหัสผ่าน", color: "#a1a1aa" },
  "role.create": { label: "สร้างบทบาท", color: "#8b5cf6" },
  "role.update": { label: "แก้ไขบทบาท", color: "#8b5cf6" },
  "role.delete": { label: "ลบบทบาท", color: "#e11d48" },
};

function actionLabel(action: string) {
  return ACTION_META[action]?.label ?? action;
}
function actionColor(action: string) {
  return ACTION_META[action]?.color ?? "#a1a1aa";
}

export default function ActivityPage() {
  const { users } = useData();

  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("all");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [items, setItems] = useState<ApiActivity[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const filtersActive =
    !!search || userId !== "all" || action !== "all" || !!dateFrom || !!dateTo;

  // Load the distinct action list once (for the dropdown).
  useEffect(() => {
    api
      .get<{ actions: string[] }>("/api/activity/actions")
      .then((r) => setActions(r.actions))
      .catch(() => setActions([]));
  }, []);

  // Refetch whenever a filter changes (debounced for the free-text search).
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (userId !== "all") params.set("userId", userId);
    if (action !== "all") params.set("action", action);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("limit", "200");

    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const run = () => {
      api
        .get<{ activity: ApiActivity[] }>(`/api/activity?${params.toString()}`)
        .then((r) => {
          if (!active) return;
          setItems(r.activity);
          setError(false);
        })
        .catch(() => {
          if (!active) return;
          setError(true);
        })
        .finally(() => active && setLoading(false));
    };
    const timer = window.setTimeout(run, search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, userId, action, dateFrom, dateTo]);

  function clearFilters() {
    setSearch("");
    setUserId("all");
    setAction("all");
    setDateFrom("");
    setDateTo("");
  }

  // Group entries by calendar day for a timeline feel.
  const groups = useMemo(() => {
    const map = new Map<string, ApiActivity[]>();
    for (const a of items) {
      const key = new Date(a.createdAt).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const arr = map.get(key) ?? [];
      if (!map.has(key)) map.set(key, arr);
      arr.push(a);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="ACTIVITY LOG"
        title="บันทึกกิจกรรม"
        description="ประวัติการทำงานทั้งหมดในระบบ (เฉพาะผู้จัดการและผู้ดูแล)"
      />

      <FilterBar trailing={`${items.length} รายการ`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาข้อความ / ผู้ใช้…"
        />
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="all">ผู้ใช้ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="all">ทุกการกระทำ</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-auto py-[7px] text-[12.5px] text-zinc-700"
          aria-label="ตั้งแต่วันที่"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-auto py-[7px] text-[12.5px] text-zinc-700"
          aria-label="ถึงวันที่"
        />
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {loading && items.length === 0 ? (
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-3 last:border-b-0">
                <div className="size-7 flex-none animate-pulse rounded-full bg-zinc-100" />
                <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12">
            <span className="text-[13px] text-zinc-500">โหลดบันทึกกิจกรรมไม่สำเร็จ</span>
            <button
              onClick={() => setSearch((s) => s)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <RefreshCw className="size-3.5" />
              ลองใหม่
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="size-5" />}
            title="ไม่พบกิจกรรม"
            description={filtersActive ? "ลองปรับตัวกรอง" : "ยังไม่มีการบันทึกกิจกรรม"}
          />
        ) : (
          groups.map(([day, entries]) => (
            <div key={day}>
              <div className="sticky top-0 z-10 border-b border-hairline bg-zinc-50/80 px-[18px] py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur">
                {day}
              </div>
              {entries.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-2.5 last:border-b-0"
                >
                  <Avatar userKey={a.user.avatarKey} size={28} fontSize={10.5} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] text-zinc-800">{a.message}</span>
                  </div>
                  <span
                    className="flex-none rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: `${actionColor(a.action)}1a`, color: actionColor(a.action) }}
                  >
                    {actionLabel(a.action)}
                  </span>
                  <span className="w-[92px] flex-none text-right text-[11.5px] text-zinc-400">
                    {relativeTimeTh(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
