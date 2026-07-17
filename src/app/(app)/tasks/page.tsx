"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePersistedState } from "@/lib/use-persisted-state";
import { Plus, Pencil, Trash2, X, KanbanSquare, Link2, Paperclip, ExternalLink, Download, CheckSquare } from "lucide-react";
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
import { KanbanSkeleton } from "@/components/skeletons";
import { KanbanBoard } from "@/components/kanban-board";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TaskForm, isImageUrl } from "@/components/forms/task-form";
import { toast } from "@/components/ui/toaster";
import { api } from "@/lib/api";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageTasks, isManagerOrAdmin } from "@/lib/permissions";
import type {
  ApiTaskDetail,
  TaskLinkInput,
  TaskAttachmentInput,
} from "@/lib/mappers";
import {
  groupTasks,
  PRIORITY_COLORS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";

const PRIORITIES = ["High", "Medium", "Low"];

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

export default function TasksPage() {
  const { tasks, projects, users, loading, addTask, updateTask, deleteTask, moveTask } =
    useData();
  const me = useCurrentUser();
  const canManage = canManageTasks(me);
  const ownsTask = (t: Task) =>
    !!me && t.assignees.some((a) => a.key === me.avatarKey);
  const canEdit = (t: Task) => isManagerOrAdmin(me) || ownsTask(t);

  const [search, setSearch] = usePersistedState("tasks.search", "");
  const [statusF, setStatusF] = usePersistedState("tasks.status", "all");
  const [priorityF, setPriorityF] = usePersistedState("tasks.priority", "all");
  const [assigneeF, setAssigneeF] = usePersistedState("tasks.assignee", "all");
  const [projectF, setProjectF] = usePersistedState("tasks.project", "all");
  const [dueF, setDueF] = usePersistedState("tasks.due", "all");

  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
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
      attachments: (detailData?.attachments ?? []).map((a) => ({
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
    dueF !== "all";

  const filtered = useMemo(() => {
    return tasks.filter(
      (t) =>
        matchesSearch([t.title, t.description], search) &&
        (statusF === "all" || t.status === statusF) &&
        (priorityF === "all" || t.pri === priorityF) &&
        (assigneeF === "all" || t.assignees.some((a) => a.key === assigneeF)) &&
        (projectF === "all" || t.proj === projectF) &&
        matchDue(t.dueISO, dueF)
    );
  }, [tasks, search, statusF, priorityF, assigneeF, projectF, dueF]);

  const columns = useMemo(() => groupTasks(filtered), [filtered]);
  const detail = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;

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
    <div className="flex h-full flex-col gap-4 px-7 py-6">
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
            {canManage && (
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
          showAdd={canManage}
          canDrag={(t) => canEdit(t)}
          onCardClick={(t) => openTask(t.id)}
          onDropTask={(id, status) => {
            const task = tasks.find((t) => t.id === id);
            if (task && task.status !== status) {
              // Optimistic move handles the UI; the store toasts on failure.
              moveTask(id, status);
            }
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
      >
        {createStatus !== null && (
          <TaskForm
            mode="create"
            defaultStatus={createStatus}
            onSubmit={async (data) => {
              const ok = await addTask(data);
              if (ok) {
                setCreateStatus(null);
                toast("สร้างงานใหม่แล้ว");
              }
              return ok;
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
        {detail && (
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
              {detail.description && (
                <div className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-500">
                  {detail.description}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {detail.assignees.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {detail.assignees.slice(0, 5).map((a) => (
                      <span key={a.id} className="rounded-full ring-2 ring-[color:var(--card)]">
                        <Avatar userKey={a.key} size={26} fontSize={10} />
                      </span>
                    ))}
                  </div>
                  <span className="text-[13px] font-medium">
                    {detail.assignees.map((a) => a.name).join(", ")}
                  </span>
                </div>
              ) : (
                <span className="text-[13px] text-zinc-400">ไม่มีผู้รับผิดชอบ</span>
              )}
              <StatusBadge
                label={detail.pri}
                colors={PRIORITY_COLORS[detail.pri]}
                shape="tag"
              />
              <div className="flex-1" />
              <span className="text-[12.5px] text-zinc-500">
                ครบกำหนด {detail.due}
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-zinc-900">
                สถานะ
              </label>
              <Select
                value={detail.status}
                disabled={!canEdit(detail)}
                onChange={(e) => {
                  // Optimistic update handles the UI; the store toasts on failure.
                  moveTask(detail.id, e.target.value as TaskStatus);
                }}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </div>

            {/* Reference links */}
            {detailData && detailData.links.length > 0 && (
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-zinc-900">
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

            {/* Attachments */}
            {detailData && detailData.attachments.length > 0 && (
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-zinc-900">
                  ไฟล์แนบ
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {detailData.attachments.map((a) =>
                    isImageUrl(a.fileUrl) || a.fileType === "image" ? (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-zinc-200 hover:border-teal-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.fileUrl}
                          alt={a.fileName}
                          className="h-24 w-full object-cover"
                        />
                        <div className="truncate px-2 py-1 text-[11px] text-zinc-500">
                          {a.fileName}
                        </div>
                      </a>
                    ) : (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-[12.5px] text-teal-600 hover:bg-zinc-50"
                      >
                        <Paperclip className="size-3.5 flex-none" />
                        <span className="truncate">{a.fileName}</span>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border-t border-hairline pt-4">
              <TaskComments taskId={detail.id} />
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editTask !== null}
        onClose={() => setEditTask(null)}
        title="แก้ไขงาน"
      >
        {editTask && (
          <TaskForm
            mode="edit"
            task={editTask}
            initialLinks={editInitial.links}
            initialAttachments={editInitial.attachments}
            onSubmit={async (data) => {
              const ok = await updateTask(editTask.id, data);
              if (ok) {
                setEditTask(null);
                toast("บันทึกการแก้ไขงานแล้ว");
              }
              return ok;
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
    </div>
  );
}
