"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  type TaskLinkInput,
  type TaskAttachmentInput,
} from "@/lib/mappers";
import type { Task, TaskStatus } from "@/lib/mock-data";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thaiToIso(due: string): string {
  const m = due.match(/(\d+)\s+(.+)/);
  if (!m) return "";
  const idx = MONTHS_TH.indexOf(m[2].trim());
  if (idx < 0) return "";
  return `2026-${String(idx + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(url);
}

type Values = {
  title: string;
  projectId: string;
  assignee: string;
  priority: PriorityEnum;
  status: TaskStatusEnum;
  dueDate: string;
  description: string;
};

type LinkRow = { title: string; url: string };
type AttachmentRow = { fileName: string; fileUrl: string };

type TaskFormProps = {
  mode: "create" | "edit";
  task?: Task;
  defaultStatus?: TaskStatus;
  initialLinks?: TaskLinkInput[];
  initialAttachments?: TaskAttachmentInput[];
  onSubmit: (data: TaskInput) => void;
  onCancel: () => void;
};

export function TaskForm({
  mode,
  task,
  defaultStatus,
  initialLinks,
  initialAttachments,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { projects, users } = useData();

  const [values, setValues] = useState<Values>(() => ({
    title: task?.title ?? "",
    projectId: "",
    assignee: "",
    priority: task ? LABEL_TO_PRIORITY[task.pri] : "MEDIUM",
    status: task
      ? LABEL_TO_TASK_STATUS[task.status]
      : defaultStatus
        ? LABEL_TO_TASK_STATUS[defaultStatus]
        : "TODO",
    dueDate: task ? thaiToIso(task.due) : "2026-07-15",
    description: task?.description ?? "",
  }));
  const [links, setLinks] = useState<LinkRow[]>(
    initialLinks?.map((l) => ({ title: l.title, url: l.url })) ?? []
  );
  const [attachments, setAttachments] = useState<AttachmentRow[]>(
    initialAttachments?.map((a) => ({ fileName: a.fileName, fileUrl: a.fileUrl })) ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => {
      const next = { ...v };
      if (!next.projectId && projects.length) {
        next.projectId =
          (task && projects.find((p) => p.code === task.proj)?.id) || projects[0].id;
      }
      if (!next.assignee && task) {
        next.assignee = users.find((u) => u.key === task.key)?.id ?? "";
      }
      return next;
    });
  }, [projects, users, task]);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.title.trim()) next.title = "กรุณากรอกชื่องาน";
    if (!values.projectId) next.projectId = "กรุณาเลือกโปรเจกต์";
    links.forEach((l, i) => {
      if (l.title.trim() || l.url.trim()) {
        if (!l.title.trim()) next[`link_${i}`] = "กรุณากรอกชื่อลิงก์";
        else if (!isValidUrl(l.url.trim())) next[`link_${i}`] = "URL ไม่ถูกต้อง";
      }
    });
    attachments.forEach((a, i) => {
      if (a.fileName.trim() || a.fileUrl.trim()) {
        if (!a.fileName.trim()) next[`att_${i}`] = "กรุณากรอกชื่อไฟล์";
        else if (!isValidUrl(a.fileUrl.trim())) next[`att_${i}`] = "URL ไม่ถูกต้อง";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    const proj = projects.find((p) => p.id === values.projectId)!;
    const cleanLinks: TaskLinkInput[] = links
      .filter((l) => l.title.trim() && l.url.trim())
      .map((l) => ({ title: l.title.trim(), url: l.url.trim() }));
    const cleanAttachments: TaskAttachmentInput[] = attachments
      .filter((a) => a.fileName.trim() && a.fileUrl.trim())
      .map((a) => ({
        fileName: a.fileName.trim(),
        fileUrl: a.fileUrl.trim(),
        fileType: isImageUrl(a.fileUrl) ? "image" : undefined,
      }));

    setSubmitting(true);
    const data: TaskInput = {
      title: values.title.trim(),
      projectId: proj.id,
      assigneeId: values.assignee || null,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
      description: values.description.trim(),
      links: cleanLinks,
      attachments: cleanAttachments,
    };
    setTimeout(() => onSubmit(data), 250);
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
          <Select value={values.projectId} onChange={(e) => set("projectId", e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ผู้รับผิดชอบ">
          <Select value={values.assignee} onChange={(e) => set("assignee", e.target.value)}>
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
          <Select value={values.priority} onChange={(e) => set("priority", e.target.value as PriorityEnum)}>
            {PRIORITY_ENUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะ">
          <Select value={values.status} onChange={(e) => set("status", e.target.value as TaskStatusEnum)}>
            {TASK_STATUS_ENUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="วันที่ครบกำหนด">
          <Input type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>
      </div>

      <Field label="รายละเอียดงาน" hint="ไม่บังคับ">
        <Textarea
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="รายละเอียดเพิ่มเติม โน้ต หรือขั้นตอน…"
        />
      </Field>

      {/* Reference links */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[12.5px] font-medium text-zinc-900">ลิงก์ที่เกี่ยวข้อง</label>
          <button
            type="button"
            onClick={() => setLinks((l) => [...l, { title: "", url: "" }])}
            className="flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:underline"
          >
            <Plus className="size-3" /> เพิ่มลิงก์
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={l.title}
                  onChange={(e) =>
                    setLinks((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                  placeholder="ชื่อลิงก์"
                />
                <Input
                  value={l.url}
                  onChange={(e) =>
                    setLinks((arr) => arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                  placeholder="https://…"
                  className="font-mono text-[12px]"
                />
              </div>
              <button
                type="button"
                onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))}
                className="mt-1.5 flex size-8 flex-none items-center justify-center rounded-lg border border-zinc-200 text-red-600 hover:bg-red-50"
                aria-label="ลบลิงก์"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {links.map((_, i) =>
            errors[`link_${i}`] ? (
              <p key={`e${i}`} className="text-[11.5px] text-red-600">
                {errors[`link_${i}`]}
              </p>
            ) : null
          )}
        </div>
      </div>

      {/* Attachments (URL only) */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[12.5px] font-medium text-zinc-900">
            ไฟล์แนบ <span className="font-normal text-zinc-400">— แนบด้วย URL</span>
          </label>
          <button
            type="button"
            onClick={() => setAttachments((a) => [...a, { fileName: "", fileUrl: "" }])}
            className="flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:underline"
          >
            <Plus className="size-3" /> เพิ่มไฟล์แนบ
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={a.fileName}
                  onChange={(e) =>
                    setAttachments((arr) => arr.map((x, j) => (j === i ? { ...x, fileName: e.target.value } : x)))
                  }
                  placeholder="ชื่อไฟล์/ชื่อรูป"
                />
                <Input
                  value={a.fileUrl}
                  onChange={(e) =>
                    setAttachments((arr) => arr.map((x, j) => (j === i ? { ...x, fileUrl: e.target.value } : x)))
                  }
                  placeholder="URL ไฟล์หรือรูปภาพ"
                  className="font-mono text-[12px]"
                />
              </div>
              <button
                type="button"
                onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}
                className="mt-1.5 flex size-8 flex-none items-center justify-center rounded-lg border border-zinc-200 text-red-600 hover:bg-red-50"
                aria-label="ลบไฟล์"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {attachments.map((_, i) =>
            errors[`att_${i}`] ? (
              <p key={`e${i}`} className="text-[11.5px] text-red-600">
                {errors[`att_${i}`]}
              </p>
            ) : null
          )}
        </div>
      </div>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "กำลังบันทึก…" : mode === "create" ? "สร้างงาน" : "บันทึก"}
        </Button>
      </FormActions>
    </div>
  );
}
