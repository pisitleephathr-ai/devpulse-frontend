"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TaskForm } from "@/components/forms/task-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import {
  groupTasks,
  TEAM_MEMBERS,
  PRIORITY_COLORS,
  TASK_PROJECTS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useData();

  const [projectFilter, setProjectFilter] = useState("all");
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const filtered = useMemo(
    () =>
      projectFilter === "all"
        ? tasks
        : tasks.filter((t) => t.proj === projectFilter),
    [tasks, projectFilter]
  );
  const columns = useMemo(() => groupTasks(filtered), [filtered]);
  const detail = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;

  return (
    <div className="flex h-full flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="TASK BOARD"
        title="บอร์ดงาน"
        actions={
          <>
            <Select
              className="w-auto py-[7px] text-[12.5px]"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">โปรเจกต์ทั้งหมด</option>
              {TASK_PROJECTS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setCreateStatus("Todo")}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              สร้างงานใหม่
            </Button>
          </>
        }
      />

      <KanbanBoard
        columns={columns}
        onCardClick={(t) => setDetailId(t.id)}
        onDropTask={(id, status) => {
          const task = tasks.find((t) => t.id === id);
          if (task && task.status !== status) {
            moveTask(id, status);
            toast(`ย้าย "${task.title}" ไป ${status}`);
          }
        }}
        onAddInColumn={(status) => setCreateStatus(status)}
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
            onSubmit={(data) => {
              addTask(data);
              setCreateStatus(null);
              toast("สร้างงานใหม่แล้ว");
            }}
            onCancel={() => setCreateStatus(null)}
          />
        )}
      </Dialog>

      {/* Detail */}
      <Dialog
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title="รายละเอียดงาน"
        footer={
          detail ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setPendingDelete(detail);
                  setDetailId(null);
                }}
              >
                <Trash2 className="size-3.5" />
                ลบ
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditTask(detail);
                  setDetailId(null);
                }}
              >
                <Pencil className="size-3.5" />
                แก้ไข
              </Button>
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
              <div className="text-[15px] font-semibold leading-snug">
                {detail.title}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar userKey={detail.key} size={26} fontSize={10} />
              <span className="text-[13px] font-medium">
                {TEAM_MEMBERS.find((m) => m.key === detail.key)?.name ??
                  detail.key}
              </span>
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
                onChange={(e) => {
                  moveTask(detail.id, e.target.value as TaskStatus);
                  toast("อัปเดตสถานะงานแล้ว");
                }}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
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
            onSubmit={(data) => {
              updateTask(editTask.id, data);
              setEditTask(null);
              toast("บันทึกการแก้ไขงานแล้ว");
            }}
            onCancel={() => setEditTask(null)}
          />
        )}
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteTask(pendingDelete.id);
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
