"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Field, FormActions } from "@/components/form-card";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import { UploadDropzone } from "@/components/attachments/upload-dropzone";
import { TaskAttachments } from "@/components/attachments/task-attachments";
import { useUploadConfig } from "@/lib/use-upload-config";
import { validateFile, formatBytes } from "@/lib/upload-config";
import { uploadFileToTask } from "@/lib/upload-file-to-task";
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
/** Default due date for a new task: a few days out (Bangkok), never in the past. */
function defaultDueIso(): string {
  const daysAhead = 2;
  return new Date(Date.now() + 7 * 3_600_000 + daysAhead * 86_400_000)
    .toISOString()
    .slice(0, 10);
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
  assigneeIds: string[];
  /** tester the card is handed to after Dev Done ("" = none) */
  handoffUserId: string;
  priority: PriorityEnum;
  status: TaskStatusEnum;
  dueDate: string;
  /** planning estimate as a datetime-local value (Bangkok wall clock) */
  estimatedFinishAt: string;
  description: string;
};

/** UTC ISO → "YYYY-MM-DDTHH:mm" in Bangkok wall-clock, for <input datetime-local>. */
function isoToBkkInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 16);
}
/** Bangkok "YYYY-MM-DDTHH:mm" → UTC ISO (treats the input as Asia/Bangkok time). */
function bkkInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(`${local}:00+07:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type LinkRow = { title: string; url: string };

type TaskFormProps = {
  mode: "create" | "edit";
  task?: Task;
  defaultStatus?: TaskStatus;
  initialLinks?: TaskLinkInput[];
  initialAttachments?: TaskAttachmentInput[];
  /** Persist the task; return its id on success (so device uploads can attach to
   *  it) or null on failure. */
  onSubmit: (data: TaskInput) => Promise<string | null>;
  onCancel: () => void;
};

type PendingFile = { id: string; file: File; previewUrl?: string; isImage: boolean };

export function TaskForm({
  mode,
  task,
  defaultStatus,
  initialLinks,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { projects, users, roles } = useData();

  // Only offer assignees whose role appears on the board. Roles flagged
  // non-assignable (e.g. system admins) are excluded — but any user already
  // assigned stays listed so they can still be removed when editing.
  const assignableCodes = roles.length
    ? new Set(roles.filter((r) => r.assignable !== false).map((r) => r.code))
    : null;
  const assigneeOptions = assignableCodes
    ? users.filter(
        (u) =>
          assignableCodes.has(u.roleCode) || task?.assignees.some((a) => a.id === u.id)
      )
    : users;

  const [values, setValues] = useState<Values>(() => ({
    title: task?.title ?? "",
    projectId: "",
    assigneeIds: task?.assignees.map((a) => a.id) ?? [],
    handoffUserId: task?.handoff?.id ?? "",
    priority: task ? LABEL_TO_PRIORITY[task.pri] : "MEDIUM",
    status: task
      ? LABEL_TO_TASK_STATUS[task.status]
      : defaultStatus
        ? LABEL_TO_TASK_STATUS[defaultStatus]
        : "TODO",
    dueDate: task ? thaiToIso(task.due) : defaultDueIso(),
    estimatedFinishAt: isoToBkkInput(task?.estimatedFinishISO ?? null),
    description: task?.description ?? "",
  }));
  const [links, setLinks] = useState<LinkRow[]>(
    initialLinks?.map((l) => ({ title: l.title, url: l.url })) ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Device files to upload AFTER the task is saved (a signed upload needs the
  // task id, which for a new task only exists once it's created).
  const { config: uploadConfig } = useUploadConfig();
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const seqRef = useRef(0);
  const pendingRef = useRef<PendingFile[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const acceptAttr = [
    ...uploadConfig.allowed.extensions,
    ...uploadConfig.allowed.imageMimeTypes,
    ...uploadConfig.allowed.documentMimeTypes,
  ].join(",");

  function addPending(files: File[]) {
    const additions: PendingFile[] = [];
    for (const file of files) {
      const v = validateFile(file, uploadConfig);
      if (!v.ok) {
        toast(v.error);
        continue;
      }
      if (
        pending.some((p) => p.file.name === file.name && p.file.size === file.size) ||
        additions.some((p) => p.file.name === file.name && p.file.size === file.size)
      )
        continue;
      const isImage = v.kind === "IMAGE";
      additions.push({
        id: `pf_${seqRef.current++}`,
        file,
        isImage,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }
    if (additions.length) setPending((p) => [...p, ...additions]);
  }

  function removePending(id: string) {
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  }

  // Revoke any object URLs on unmount.
  useEffect(
    () => () => {
      for (const p of pendingRef.current) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => {
      const next = { ...v };
      if (!next.projectId && projects.length) {
        next.projectId =
          (task && projects.find((p) => p.code === task.proj)?.id) || projects[0].id;
      }
      return next;
    });
  }, [projects, task]);

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
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const proj = projects.find((p) => p.id === values.projectId)!;
    const cleanLinks: TaskLinkInput[] = links
      .filter((l) => l.title.trim() && l.url.trim())
      .map((l) => ({ title: l.title.trim(), url: l.url.trim() }));

    setSubmitting(true);
    // Note: `attachments` is intentionally omitted — image/file attachments are
    // managed via the dedicated upload/delete endpoints (device picker below /
    // the TaskAttachments panel), so the task payload must not replace them.
    const data: TaskInput = {
      title: values.title.trim(),
      projectId: proj.id,
      assigneeIds: values.assigneeIds,
      handoffUserId: values.handoffUserId || null,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
      estimatedFinishAt: bkkInputToIso(values.estimatedFinishAt),
      description: values.description.trim(),
      links: cleanLinks,
    };

    // 1) Save the task (create or edit) → get its id.
    const taskId = await onSubmit(data);
    if (!taskId) {
      setSubmitting(false);
      return;
    }

    // 2) Upload any device files to the (now-existing) task. Independent per file
    //    so one failure doesn't sink the rest.
    if (pending.length > 0) {
      setUploading(true);
      const results = await Promise.allSettled(
        pending.map((p) => uploadFileToTask(taskId, p.file))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      for (const p of pending) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      if (failed > 0) toast(`อัปโหลดไฟล์ไม่สำเร็จ ${failed} รายการ`);
    }

    toast(mode === "create" ? "สร้างงานใหม่แล้ว" : "บันทึกการแก้ไขงานแล้ว");
    onCancel(); // close the dialog
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

      {/* Two columns to match the detail modal: settings (left) + content (right). */}
      <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">

      <Field label="โปรเจกต์" error={errors.projectId}>
        <Select value={values.projectId} onChange={(e) => set("projectId", e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="ผู้รับผิดชอบ" hint="เลือกได้หลายคน">
        {assigneeOptions.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
            เลือกผู้รับผิดชอบ…
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {assigneeOptions.map((u) => {
              const selected = values.assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    set(
                      "assigneeIds",
                      selected
                        ? values.assigneeIds.filter((id) => id !== u.id)
                        : [...values.assigneeIds, u.id]
                    )
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[12px] font-medium transition-colors",
                    selected
                      ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                      : "border-border text-zinc-600 hover:bg-muted dark:text-zinc-300"
                  )}
                >
                  <Avatar userKey={u.key} size={18} fontSize={8} />
                  {u.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="ผู้รับต่อ (ผู้ทดสอบ)" hint="รับงานอัตโนมัติเมื่อการ์ดถึง Dev Done">
        <Select value={values.handoffUserId} onChange={(e) => set("handoffUserId", e.target.value)}>
          <option value="">— ไม่มี —</option>
          {assigneeOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

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

      <Field label="คาดการณ์เสร็จ (วัน + เวลา)" hint="ใช้วางแผนงานรายสัปดาห์">
        <Input
          type="datetime-local"
          value={values.estimatedFinishAt}
          onChange={(e) => set("estimatedFinishAt", e.target.value)}
        />
      </Field>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
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

      {/* Attachments — edit: manage live (upload + delete); create: hold files
          and upload them right after the task is created. */}
      {mode === "edit" && task ? (
        <TaskAttachments taskId={task.id} canManage initialAttachments={[]} />
      ) : (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-zinc-900">
            ไฟล์แนบ <span className="font-normal text-zinc-400">— รูปภาพหรือเอกสาร</span>
          </label>
          <UploadDropzone onFiles={addPending} accept={acceptAttr} disabled={submitting} />
          {pending.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-hairline bg-card p-2"
                >
                  <div className="flex size-9 flex-none items-center justify-center overflow-hidden rounded bg-muted">
                    {p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : p.isImage ? (
                      <ImageIcon className="size-4 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] font-medium" title={p.file.name}>
                      {p.file.name}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {formatBytes(p.file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePending(p.id)}
                    disabled={uploading}
                    className="flex-none rounded p-1 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                    aria-label={`นำออก ${p.file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {pending.length > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              ไฟล์จะถูกอัปโหลดหลังกดสร้างงาน
            </p>
          )}
        </div>
      )}
      </div>
      </div>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {uploading
            ? "กำลังอัปโหลดไฟล์…"
            : submitting
              ? "กำลังบันทึก…"
              : mode === "create"
                ? "สร้างงาน"
                : "บันทึก"}
        </Button>
      </FormActions>
    </div>
  );
}
