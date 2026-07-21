"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePersistedState } from "@/lib/use-persisted-state";
import { Plus, Pencil, Trash2, X, KanbanSquare, Link2, ExternalLink, Download, CheckSquare, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { matchesSearch } from "@/lib/filters";
import { downloadExcel, todayStamp } from "@/lib/excel";
import { TaskComments } from "@/components/task-comments";
import { TaskChecklist } from "@/components/task-checklist";
import { TaskAttachments } from "@/components/attachments/task-attachments";
import { KanbanSkeleton } from "@/components/skeletons";
import { KanbanBoard } from "@/components/kanban-board";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TaskForm } from "@/components/forms/task-form";
import { toast } from "@/components/ui/toaster";
import { api } from "@/lib/api";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageTasks, canCreateTask, isManagerOrAdmin } from "@/lib/permissions";
import type {
  ApiTaskDetail,
  TaskLinkInput,
  TaskAttachmentInput,
} from "@/lib/mappers";
import {
  groupTasks,
  canMoveTask,
  ALLOWED_TRANSITIONS,
  PRIORITY_COLORS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";

const PRIORITIES = ["High", "Medium", "Low"];

/** Compact Bangkok date+time label for the card timeline (— when absent). */
function fmtBkkDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Client-side due-date preset matcher. */
function matchDue(iso: string | null, f: string): boolean {
  if (f === "all") return true;
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (f === "today") {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return d >= start && d < end;
  }
  if (f === "week") {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return d >= start && d < end;
  }
  if (f === "month")
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return true;
}

/**
 * Whether a task's due day falls inside the [from, to] range (inclusive).
 * Either bound may be empty (open-ended). ISO day strings (YYYY-MM-DD) compare
 * chronologically as plain strings; bounds are normalised so a reversed range
 * (from > to) still works.
 */
function matchDueRange(iso: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const d = iso.slice(0, 10);
  const lo = from && to ? (from <= to ? from : to) : from;
  const hi = from && to ? (from <= to ? to : from) : to;
  if (lo && d < lo) return false;
  if (hi && d > hi) return false;
  return true;
}

export default function TasksPage() {
  const { tasks, projects, users, loading, addTask, updateTask, deleteTask, moveTask, reworkTask } =
    useData();
  const me = useCurrentUser();
  const canManage = canManageTasks(me);
  // Creating board tasks can be granted to a role via the TASK_CREATE capability
  // (managers/admins always have it).
  const canCreate = canCreateTask(me);
  // A card is "yours" if you're an assignee OR the handoff tester (the tester is
  // intentionally kept out of assignees but still owns the card once handed off).
  const ownsTask = (t: Task) =>
    !!me &&
    (t.assignees.some((a) => a.key === me.avatarKey) || t.handoff?.key === me.avatarKey);
  const canEdit = (t: Task) => isManagerOrAdmin(me) || ownsTask(t);

  const [search, setSearch] = usePersistedState("tasks.search", "");
  const [statusF, setStatusF] = usePersistedState("tasks.status", "all");
  const [priorityF, setPriorityF] = usePersistedState("tasks.priority", "all");
  const [assigneeF, setAssigneeF] = usePersistedState("tasks.assignee", "all");
  const [projectF, setProjectF] = usePersistedState("tasks.project", "all");
  const [dueF, setDueF] = usePersistedState("tasks.due", "all");
  // Due-date range filter (YYYY-MM-DD each; "" = open-ended). Independent of the
  // relative due filter above.
  const [dueFromF, setDueFromF] = usePersistedState("tasks.dueFrom", "");
  const [dueToF, setDueToF] = usePersistedState("tasks.dueTo", "");

  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  // Delivery Fail flow: the card being marked failed (opens the reason dialog).
  const [failCard, setFailCard] = useState<Task | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ApiTaskDetail | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  // Open/close the detail card while keeping the URL in sync, so a card is
  // deep-linkable and shareable (?task=<id>) — e.g. from notifications.
  const openTask = (id: string) => {
    setDetailId(id);
    router.replace(`${pathname}?task=${id}`, { scroll: false });
  };
  const closeTask = () => {
    setDetailId(null);
    router.replace(pathname, { scroll: false });
  };
  // On first load, open the card named in ?task=<id> (read after mount to
  // avoid useSearchParams' Suspense requirement, matching the login page).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("task");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setDetailId(id);
  }, []);
  const [editInitial, setEditInitial] = useState<{
    links: TaskLinkInput[];
    attachments: TaskAttachmentInput[];
  }>({ links: [], attachments: [] });
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  // Bulk-select mode (managers): pick multiple cards, then move/delete together.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };
  async function bulkMove(status: TaskStatus) {
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map((id) => moveTask(id, status)));
    const okCount = results.filter(Boolean).length;
    if (okCount) toast(`ย้าย ${okCount} งานไป ${status}`);
    exitSelect();
  }
  async function bulkDelete() {
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map((id) => deleteTask(id)));
    const okCount = results.filter(Boolean).length;
    if (okCount) toast(`ลบ ${okCount} งานแล้ว`);
    setConfirmBulkDelete(false);
    exitSelect();
  }

  function openEdit(t: Task) {
    setEditInitial({
      links: (detailData?.links ?? []).map((l) => ({ title: l.title, url: l.url })),
      // Only URL/link attachments are edited via the form's URL rows. Cloudinary
      // uploads are managed in the detail view and are preserved on save.
      attachments: (detailData?.attachments ?? [])
        .filter((a) => (a.source ?? "URL") === "URL")
        .map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileType: a.fileType ?? undefined,
        })),
    });
    setEditTask(t);
    closeTask();
  }

  const filtersActive =
    !!search ||
    statusF !== "all" ||
    priorityF !== "all" ||
    assigneeF !== "all" ||
    projectF !== "all" ||
    dueF !== "all" ||
    dueFromF !== "" ||
    dueToF !== "";

  const filtered = useMemo(() => {
    return tasks.filter(
      (t) =>
        matchesSearch([t.title, t.description], search) &&
        (statusF === "all" || t.status === statusF) &&
        (priorityF === "all" || t.pri === priorityF) &&
        (assigneeF === "all" || t.assignees.some((a) => a.key === assigneeF)) &&
        (projectF === "all" || t.proj === projectF) &&
        matchDue(t.dueISO, dueF) &&
        matchDueRange(t.dueISO, dueFromF, dueToF)
    );
  }, [tasks, search, statusF, priorityF, assigneeF, projectF, dueF, dueFromF, dueToF]);

  const columns = useMemo(() => groupTasks(filtered), [filtered]);
  const detail = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;
  // The modal body renders in one step: hold a skeleton until the full detail
  // (links/attachments/checklist) for THIS task has loaded, so sections don't
  // pop in and reflow after the base info shows.
  const detailReady = !!detail && detailData?.id === detail.id;

  // Load full detail (links + attachments) when a task is opened.
  useEffect(() => {
    if (!detailId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailData(null);
      return;
    }
    let alive = true;
    api
      .get<{ task: ApiTaskDetail }>(`/api/tasks/${detailId}`)
      .then((r) => alive && setDetailData(r.task))
      .catch(() => alive && setDetailData(null));
    return () => {
      alive = false;
    };
  }, [detailId]);

  function clearFilters() {
    setSearch("");
    setStatusF("all");
    setPriorityF("all");
    setAssigneeF("all");
    setProjectF("all");
    setDueF("all");
    setDueFromF("");
    setDueToF("");
  }

  function exportExcel() {
    const nameByCode = new Map(projects.map((p) => [p.code, p.name]));
    downloadExcel(
      `tasks-${todayStamp()}.xls`,
      ["ชื่องาน", "รายละเอียด", "โปรเจกต์", "ผู้รับผิดชอบ", "สถานะ", "ความสำคัญ", "กำหนดส่ง", "จำนวนลิงก์"],
      filtered.map((t) => [
        t.title,
        t.description,
        nameByCode.get(t.proj) ?? t.proj,
        t.assignees.map((a) => a.name).join(", ") || "—",
        t.status,
        t.pri,
        t.dueISO ?? "",
        t.linkCount,
      ]),
      "บอร์ดงาน"
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-7 py-6">
      <PageHeader
        eyebrow="TASK BOARD"
        title="บอร์ดงาน"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3.5" />
              ส่งออก Excel
            </button>
            {canManage && !selectMode && (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <CheckSquare className="size-3.5" />
                เลือกหลายรายการ
              </button>
            )}
            {canCreate && (
              <Button onClick={() => setCreateStatus("Todo")}>
                <Plus className="size-3.5" strokeWidth={2.4} />
                สร้างงานใหม่
              </Button>
            )}
          </div>
        }
      />

      <FilterBar trailing={`${filtered.length} งาน`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่องาน / รายละเอียด…"
        />
        {me && (
          <button
            onClick={() =>
              setAssigneeF(assigneeF === me.avatarKey ? "all" : me.avatarKey)
            }
            className={`rounded-lg border px-2.5 py-[7px] text-[12.5px] font-medium transition-colors ${
              assigneeF === me.avatarKey
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            งานของฉัน
          </button>
        )}
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value)}
        >
          <option value="all">ความสำคัญทั้งหมด</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={assigneeF}
          onChange={(e) => setAssigneeF(e.target.value)}
        >
          <option value="all">ผู้รับผิดชอบทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.key}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={projectF}
          onChange={(e) => setProjectF(e.target.value)}
        >
          <option value="all">โปรเจกต์ทั้งหมด</option>
          {projects.map((p) => (
            <option key={p.id} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={dueF}
          onChange={(e) => setDueF(e.target.value)}
        >
          <option value="all">ครบกำหนดทั้งหมด</option>
          <option value="today">วันนี้</option>
          <option value="week">สัปดาห์นี้</option>
          <option value="month">เดือนนี้</option>
        </Select>
        {/* Due-date range (จาก–ถึง). Reads as one unit; each bound is optional. */}
        <div
          className={`flex items-center gap-1.5 rounded-lg border bg-card px-2 py-[5px] text-[12.5px] text-foreground transition-colors [color-scheme:light] dark:[color-scheme:dark] ${
            dueFromF || dueToF ? "border-teal-500" : "border-border"
          }`}
        >
          <CalendarRange
            className={`size-3.5 flex-none ${dueFromF || dueToF ? "text-teal-600" : "text-muted-foreground"}`}
          />
          <input
            type="date"
            value={dueFromF}
            max={dueToF || undefined}
            onChange={(e) => setDueFromF(e.target.value)}
            aria-label="ครบกำหนดตั้งแต่วันที่"
            title="ครบกำหนดตั้งแต่วันที่"
            className="w-[122px] bg-transparent text-foreground outline-none"
          />
          <span className="flex-none text-muted-foreground">–</span>
          <input
            type="date"
            value={dueToF}
            min={dueFromF || undefined}
            onChange={(e) => setDueToF(e.target.value)}
            aria-label="ครบกำหนดถึงวันที่"
            title="ครบกำหนดถึงวันที่"
            className="w-[122px] bg-transparent text-foreground outline-none"
          />
          {(dueFromF || dueToF) && (
            <button
              onClick={() => {
                setDueFromF("");
                setDueToF("");
              }}
              aria-label="ล้างช่วงวันครบกำหนด"
              title="ล้างช่วงวันครบกำหนด"
              className="flex-none rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
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

      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 dark:border-teal-900/50 dark:bg-teal-950/25">
          <span className="text-[13px] font-semibold text-teal-800 dark:text-teal-200">
            เลือก {selectedIds.size} งาน
          </span>
          <div className="flex-1" />
          <span className="text-[12px] text-teal-700 dark:text-teal-300">ย้ายไป:</span>
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              disabled={selectedIds.size === 0}
              onClick={() => bulkMove(s)}
              className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-[12px] font-medium text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-40 dark:bg-transparent dark:text-teal-200"
            >
              {s}
            </button>
          ))}
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setConfirmBulkDelete(true)}
            className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:bg-transparent"
          >
            <Trash2 className="size-3.5" /> ลบ
          </button>
          <button
            onClick={exitSelect}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <X className="size-3.5" /> เสร็จ
          </button>
        </div>
      )}

      {loading && tasks.length === 0 ? (
        <KanbanSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState
            icon={<KanbanSquare className="size-5" />}
            title="ไม่พบงานที่ตรงกับตัวกรอง"
            description="ลองปรับหรือล้างตัวกรอง"
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearFilters}>
                  ล้างตัวกรอง
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          showAdd={canCreate}
          canDrag={(t) => canEdit(t)}
          canDropTo={(t, status) =>
            canMoveTask(t, status, { id: me?.id ?? null, isManager: isManagerOrAdmin(me) })
          }
          onCardClick={(t) => openTask(t.id)}
          onDropTask={(id, status) => {
            const task = tasks.find((t) => t.id === id);
            if (!task || task.status === status) return;
            // Delivery Fail always spawns a rework task — collect the reason first.
            if (status === "Delivery Fail") {
              setFailCard(task);
              return;
            }
            // Optimistic move handles the UI; the store toasts on failure.
            moveTask(id, status);
          }}
          onAddInColumn={(status) => setCreateStatus(status)}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`ลบ ${selectedIds.size} งาน?`}
        message="ต้องการลบงานที่เลือกทั้งหมดออกจากบอร์ดใช่หรือไม่ — การกระทำนี้ย้อนกลับไม่ได้"
        confirmLabel="ลบงานที่เลือก"
        destructive
      />

      {/* Create */}
      <Dialog
        open={createStatus !== null}
        onClose={() => setCreateStatus(null)}
        title="สร้างงานใหม่"
        description="เพิ่มงานลงในบอร์ด"
        className="w-[960px]"
      >
        {createStatus !== null && (
          <TaskForm
            mode="create"
            defaultStatus={createStatus}
            onSubmit={async (data) => {
              const task = await addTask(data);
              return task ? task.id : null;
            }}
            onCancel={() => setCreateStatus(null)}
          />
        )}
      </Dialog>

      {/* Detail */}
      <Dialog
        open={detail !== null}
        onClose={() => closeTask()}
        title="รายละเอียดงาน"
        className="w-[960px]"
        footer={
          detail ? (
            <>
              {canManage && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setPendingDelete(detail);
                    closeTask();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  ลบ
                </Button>
              )}
              {canEdit(detail) && (
                <Button variant="secondary" onClick={() => openEdit(detail)}>
                  <Pencil className="size-3.5" />
                  แก้ไข
                </Button>
              )}
            </>
          ) : null
        }
      >
        {detail && !detailReady && (
          <div className="flex animate-pulse flex-col gap-4" aria-hidden>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-28 rounded-full bg-muted" />
              <div className="h-6 w-20 rounded-full bg-muted" />
            </div>
            <div className="h-9 w-full rounded-lg bg-muted" />
            <div className="h-24 w-full rounded-lg bg-muted" />
          </div>
        )}
        {detail && detailReady && (
          <div className="flex flex-col gap-4">
            <div>
              <div
                className="mb-1.5 font-mono text-[11px] font-semibold"
                style={{ color: detail.projFg }}
              >
                {detail.proj}
              </div>
              <div className="text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">
                {detail.title}
              </div>
            </div>

            {/* Two columns on desktop: main content (left) + properties (right).
                On mobile they stack with properties first. */}
            <div className="flex flex-col-reverse gap-5 md:flex-row md:gap-6">
              {/* MAIN — description, links, attachments, comments */}
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {/* Task description (left side, not full-width under the title). */}
                <div>
                  <div className="mb-1.5 text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">
                    รายละเอียดงาน
                  </div>
                  {detail.description ? (
                    <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300 [overflow-wrap:anywhere]">
                      {detail.description}
                    </div>
                  ) : (
                    <div className="text-[12.5px] text-muted-foreground">— ไม่มีรายละเอียด —</div>
                  )}
                </div>

                {/* Reference links */}
                {detailData && detailData.links.length > 0 && (
                  <div className="border-t border-hairline pt-4">
                    <div className="mb-1.5 text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">
                      ลิงก์ที่เกี่ยวข้อง
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {detailData.links.map((l) => (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[13px] text-teal-600 hover:underline"
                        >
                          <Link2 className="size-3.5 flex-none" />
                          <span className="truncate">{l.title}</span>
                          <ExternalLink className="size-3 flex-none text-zinc-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments — mounts once the full detail has loaded. */}
                {detailData?.id === detail.id && (
                  <div className="border-t border-hairline pt-4">
                    {/* View-only in the detail dialog — add/delete is in edit mode. */}
                    <TaskAttachments
                      key={detail.id}
                      taskId={detail.id}
                      initialAttachments={detailData.attachments ?? []}
                      canManage={false}
                    />
                  </div>
                )}

                {/* Comments */}
                <div className="border-t border-hairline pt-4">
                  <TaskComments taskId={detail.id} />
                </div>
              </div>

              {/* SIDEBAR — properties + checklist */}
              <div className="flex flex-col gap-4 md:w-[272px] md:flex-none">
                <div className="flex flex-col gap-3.5 rounded-xl border border-hairline bg-muted/30 p-3.5">
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      ผู้รับผิดชอบ
                    </div>
                    {detail.assignees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {detail.assignees.slice(0, 5).map((a) => (
                            <span key={a.id} className="rounded-full ring-2 ring-[color:var(--card)]">
                              <Avatar userKey={a.key} size={24} fontSize={10} />
                            </span>
                          ))}
                        </div>
                        <span className="text-[12.5px] font-medium [overflow-wrap:anywhere]">
                          {detail.assignees.map((a) => a.name).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-muted-foreground">ไม่มีผู้รับผิดชอบ</span>
                    )}
                  </div>

                  {detail.handoff && (
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                        ผู้รับต่อ (ผู้ทดสอบ)
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar userKey={detail.handoff.key} size={24} fontSize={10} />
                        <span className="text-[12.5px] font-medium [overflow-wrap:anywhere]">
                          {detail.handoff.name}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      ความสำคัญ
                    </div>
                    <StatusBadge
                      label={detail.pri}
                      colors={PRIORITY_COLORS[detail.pri]}
                      shape="tag"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      ครบกำหนด
                    </div>
                    <span className="text-[12.5px]">{detail.due}</span>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      สถานะ
                    </div>
                    <Select
                      value={detail.status}
                      disabled={!canEdit(detail)}
                      onChange={(e) => {
                        const next = e.target.value as TaskStatus;
                        if (next === detail.status) return;
                        // Delivery Fail collects a reason + spawns a rework task.
                        if (next === "Delivery Fail") {
                          setFailCard(detail);
                          return;
                        }
                        // Optimistic update handles the UI; the store toasts on failure.
                        moveTask(detail.id, next);
                      }}
                    >
                      {/* Managers can jump anywhere; others see only the current
                          status + its allowed forward steps. */}
                      {(isManagerOrAdmin(me)
                        ? TASK_STATUSES
                        : [detail.status, ...(ALLOWED_TRANSITIONS[detail.status] ?? [])]
                      ).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Workflow timeline — actual-time stamps + the planning estimate. */}
                  {(detail.estimatedFinishISO ||
                    detail.startedISO ||
                    detail.devDoneISO ||
                    detail.testStartedISO ||
                    detail.completedISO) && (
                    <div className="border-t border-hairline pt-3">
                      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                        ไทม์ไลน์
                      </div>
                      <dl className="flex flex-col gap-1 text-[12px]">
                        {detail.estimatedFinishISO && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">คาดว่าเสร็จ</dt>
                            <dd className="font-medium tabular-nums">{fmtBkkDateTime(detail.estimatedFinishISO)}</dd>
                          </div>
                        )}
                        {detail.startedISO && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">เริ่มจริง</dt>
                            <dd className="font-medium tabular-nums">{fmtBkkDateTime(detail.startedISO)}</dd>
                          </div>
                        )}
                        {detail.devDoneISO && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Dev เสร็จ</dt>
                            <dd className="font-medium tabular-nums">{fmtBkkDateTime(detail.devDoneISO)}</dd>
                          </div>
                        )}
                        {detail.testStartedISO && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">เริ่มทดสอบ</dt>
                            <dd className="font-medium tabular-nums">{fmtBkkDateTime(detail.testStartedISO)}</dd>
                          </div>
                        )}
                        {detail.completedISO && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">ส่งมอบ</dt>
                            <dd className="font-medium tabular-nums text-teal-600">{fmtBkkDateTime(detail.completedISO)}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Rework lineage (origin ↔ reworks). */}
                  {(detailData?.originTask || (detailData?.reworkTasks?.length ?? 0) > 0) && (
                    <div className="border-t border-hairline pt-3">
                      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                        งานที่เกี่ยวข้อง
                      </div>
                      <div className="flex flex-col gap-1 text-[12px]">
                        {detailData?.originTask && (
                          <button
                            onClick={() => openTask(detailData.originTask!.id)}
                            className="truncate text-left text-teal-600 hover:underline"
                          >
                            ↩ แก้ไขจาก: {detailData.originTask.title}
                          </button>
                        )}
                        {detailData?.reworkTasks?.map((rt) => (
                          <button
                            key={rt.id}
                            onClick={() => openTask(rt.id)}
                            className="truncate text-left text-teal-600 hover:underline"
                          >
                            ↪ งานแก้ไข: {rt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist / subtasks */}
                {detailData?.id === detail.id && (
                  <TaskChecklist
                    key={detail.id}
                    taskId={detail.id}
                    initialItems={detailData.checklist ?? []}
                    canEdit={canEdit(detail)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editTask !== null}
        onClose={() => setEditTask(null)}
        title="แก้ไขงาน"
        className="w-[960px]"
      >
        {editTask && (
          <TaskForm
            mode="edit"
            task={editTask}
            initialLinks={editInitial.links}
            initialAttachments={editInitial.attachments}
            onSubmit={async (data) => {
              const ok = await updateTask(editTask.id, data);
              return ok ? editTask.id : null;
            }}
            onCancel={() => setEditTask(null)}
          />
        )}
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete && (await deleteTask(pendingDelete.id))) {
            toast("ลบงานแล้ว");
          }
        }}
        title="ลบงานนี้?"
        message={`ต้องการลบ "${pendingDelete?.title}" ออกจากบอร์ดใช่หรือไม่ — การกระทำนี้ย้อนกลับไม่ได้`}
        confirmLabel="ลบงาน"
        destructive
      />

      {/* Delivery Fail → reason + spawn a rework task in To Do */}
      <DeliveryFailDialog
        card={failCard}
        onClose={() => setFailCard(null)}
        onConfirm={async (reason) => {
          if (!failCard) return;
          // Mark the card failed, then spawn the rework task from it.
          const moved = await moveTask(failCard.id, "Delivery Fail");
          if (moved) await reworkTask(failCard.id, reason);
          setFailCard(null);
        }}
      />
    </div>
  );
}

/** Collects the failure reason, then marks the card failed + creates a rework task. */
function DeliveryFailDialog({
  card,
  onClose,
  onConfirm,
}: {
  card: Task | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (card) setReason("");
  }, [card]);

  return (
    <Dialog
      open={card !== null}
      onClose={saving ? () => {} : onClose}
      title="ส่งมอบไม่ผ่าน"
      className="w-[520px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            variant="danger"
            disabled={saving || !reason.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm(reason.trim());
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "กำลังบันทึก…" : "ยืนยัน + สร้างงานแก้ไข"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted-foreground">
          ระบุเหตุผลที่งาน <b className="text-foreground">{card?.title}</b> ไม่ผ่าน —
          ระบบจะบันทึกเป็นคอมเมนต์บนการ์ดนี้ และสร้างงานแก้ไขใหม่ใน To Do ที่อ้างอิงงานเดิม
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          autoFocus
          placeholder="เช่น ปุ่มบันทึกยังไม่ทำงานบนมือถือ / ผลลัพธ์ไม่ตรงกับที่ออกแบบ"
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        />
      </div>
    </Dialog>
  );
}
