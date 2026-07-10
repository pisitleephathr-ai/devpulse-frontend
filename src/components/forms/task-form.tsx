"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormActions } from "@/components/form-card";
import {
  TASK_PROJECTS,
  TASK_STATUSES,
  PRIORITIES,
  TEAM_MEMBERS,
  type Task,
  type Priority,
  type TaskStatus,
} from "@/lib/mock-data";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function formatThaiDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

type Values = {
  title: string;
  projCode: string;
  assignee: string;
  pri: Priority;
  due: string; // ISO in the input
  status: TaskStatus;
};

const EMPTY: Values = {
  title: "",
  projCode: TASK_PROJECTS[0].code,
  assignee: TEAM_MEMBERS[0].key,
  pri: "Medium",
  due: "2026-07-15",
  status: "Todo",
};

/** Best-effort reverse of "14 ก.ค." back to an ISO date for the input. */
function dueToIso(due: string): string {
  const m = due.match(/(\d+)\s+(.+)/);
  if (!m) return EMPTY.due;
  const day = m[1].padStart(2, "0");
  const monthIdx = MONTHS.indexOf(m[2].trim());
  if (monthIdx < 0) return EMPTY.due;
  return `2026-${String(monthIdx + 1).padStart(2, "0")}-${day}`;
}

type TaskFormProps = {
  mode: "create" | "edit";
  task?: Task;
  /** Preselected status for create mode (e.g. the column the user clicked). */
  defaultStatus?: TaskStatus;
  onSubmit: (data: Omit<Task, "id">) => void;
  onCancel: () => void;
};

export function TaskForm({
  mode,
  task,
  defaultStatus,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const initial: Values =
    mode === "edit" && task
      ? {
          title: task.title,
          projCode: task.proj,
          assignee: task.key,
          pri: task.pri,
          due: dueToIso(task.due),
          status: task.status,
        }
      : { ...EMPTY, status: defaultStatus ?? EMPTY.status };

  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.title.trim()) next.title = "กรุณากรอกชื่องาน";
    if (!values.due) next.due = "กรุณาเลือกวันครบกำหนด";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    const proj = TASK_PROJECTS.find((p) => p.code === values.projCode)!;
    setSubmitting(true);
    const data: Omit<Task, "id"> = {
      title: values.title.trim(),
      proj: proj.code,
      projFg: proj.color,
      key: values.assignee,
      pri: values.pri,
      due: formatThaiDate(values.due),
      status: values.status,
    };
    setTimeout(() => onSubmit(data), 400);
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
        <Field label="โปรเจกต์">
          <Select
            value={values.projCode}
            onChange={(e) => set("projCode", e.target.value)}
          >
            {TASK_PROJECTS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ผู้รับผิดชอบ">
          <Select
            value={values.assignee}
            onChange={(e) => set("assignee", e.target.value)}
          >
            {TEAM_MEMBERS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field label="ความสำคัญ">
          <Select
            value={values.pri}
            onChange={(e) => set("pri", e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะ">
          <Select
            value={values.status}
            onChange={(e) => set("status", e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="ครบกำหนด" error={errors.due}>
          <Input
            type="date"
            value={values.due}
            onChange={(e) => set("due", e.target.value)}
          />
        </Field>
      </div>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => {
            setValues(initial);
            setErrors({});
          }}
        >
          รีเซ็ต
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting
            ? "กำลังบันทึก…"
            : mode === "create"
              ? "สร้างงาน"
              : "บันทึก"}
        </Button>
      </FormActions>
    </div>
  );
}
