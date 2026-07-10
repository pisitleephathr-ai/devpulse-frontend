"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormActions } from "@/components/form-card";
import { useData } from "@/lib/store";
import {
  PRIORITY_ENUM_OPTIONS,
  TASK_STATUS_ENUM_OPTIONS,
  LABEL_TO_PRIORITY,
  LABEL_TO_TASK_STATUS,
  type PriorityEnum,
  type TaskStatusEnum,
  type TaskInput,
} from "@/lib/mappers";
import type { Task, TaskStatus } from "@/lib/mock-data";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** Best-effort "14 ก.ค." -> "2026-07-14" for prefilling the date input. */
function thaiToIso(due: string): string {
  const m = due.match(/(\d+)\s+(.+)/);
  if (!m) return "";
  const idx = MONTHS_TH.indexOf(m[2].trim());
  if (idx < 0) return "";
  return `2026-${String(idx + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

type Values = {
  title: string;
  projectId: string;
  assigneeId: string; // "" = unassigned
  priority: PriorityEnum;
  status: TaskStatusEnum;
  dueDate: string;
};

type TaskFormProps = {
  mode: "create" | "edit";
  task?: Task;
  /** Column the user clicked (create mode), as a display label. */
  defaultStatus?: TaskStatus;
  onSubmit: (data: TaskInput) => void;
  onCancel: () => void;
};

export function TaskForm({
  mode,
  task,
  defaultStatus,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { projects, users } = useData();

  const [values, setValues] = useState<Values>(() => ({
    title: task?.title ?? "",
    projectId: "",
    assigneeId: "",
    priority: task ? LABEL_TO_PRIORITY[task.pri] : "MEDIUM",
    status: task
      ? LABEL_TO_TASK_STATUS[task.status]
      : defaultStatus
        ? LABEL_TO_TASK_STATUS[defaultStatus]
        : "TODO",
    dueDate: task ? thaiToIso(task.due) : "2026-07-15",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Resolve project/assignee ids once reference data is loaded.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => {
      const next = { ...v };
      if (!next.projectId && projects.length) {
        next.projectId =
          (task && projects.find((p) => p.code === task.proj)?.id) ||
          projects[0].id;
      }
      if (!next.assigneeId && task) {
        next.assigneeId = users.find((u) => u.key === task.key)?.id ?? "";
      }
      return next;
    });
  }, [projects, users, task]);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.title.trim()) next.title = "กรุณากรอกชื่องาน";
    if (!values.projectId) next.projectId = "กรุณาเลือกโปรเจกต์";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    setSubmitting(true);
    const data: TaskInput = {
      title: values.title.trim(),
      projectId: values.projectId,
      assigneeId: values.assigneeId || null,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
    };
    setTimeout(() => onSubmit(data), 300);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="ชื่องาน" error={errors.title}>
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="เช่น ทำหน้าตั้งค่าการแจ้งเตือน"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="โปรเจกต์" error={errors.projectId}>
          <Select
            value={values.projectId}
            onChange={(e) => set("projectId", e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ผู้รับผิดชอบ">
          <Select
            value={values.assigneeId}
            onChange={(e) => set("assigneeId", e.target.value)}
          >
            <option value="">— ไม่ระบุ —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field label="ความสำคัญ">
          <Select
            value={values.priority}
            onChange={(e) => set("priority", e.target.value as PriorityEnum)}
          >
            {PRIORITY_ENUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะ">
          <Select
            value={values.status}
            onChange={(e) => set("status", e.target.value as TaskStatusEnum)}
          >
            {TASK_STATUS_ENUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ครบกำหนด">
          <Input
            type="date"
            value={values.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </Field>
      </div>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "กำลังบันทึก…" : mode === "create" ? "สร้างงาน" : "บันทึก"}
        </Button>
      </FormActions>
    </div>
  );
}
