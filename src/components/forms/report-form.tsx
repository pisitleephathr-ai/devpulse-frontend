"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { bangkokDateISO } from "@/lib/thai-datetime";
import {
  REPORT_STATUS_ENUM_OPTIONS,
  TH_TO_REPORT_STATUS,
  type ReportInput,
  type ReportStatusEnum,
} from "@/lib/mappers";
import type { Report, Task } from "@/lib/mock-data";

type Values = {
  projectId: string;
  date: string;
  did: string;
  blockers: string;
  plan: string;
  status: ReportStatusEnum;
  /** optional linked board tasks */
  relatedTaskIds: string[];
};

/** Compact display shape used by the related-task picker. */
type PickTask = {
  id: string;
  title: string;
  proj: string;
  projColor: string;
  status: string;
};

type ReportFormProps = {
  mode: "create" | "edit";
  report?: Report;
  onSubmit: (data: ReportInput) => void | Promise<boolean | void>;
  onCancel: () => void;
};

export function ReportForm({ mode, report, onSubmit, onCancel }: ReportFormProps) {
  const { projects, tasks } = useData();
  const me = useCurrentUser();

  const [values, setValues] = useState<Values>(() => ({
    projectId: "",
    // Filled on mount with today's Asia/Bangkok date (see effect below) so a
    // static prerender can't lock in a build-time day and shift it backward.
    date: "",
    did: report?.did ?? "",
    blockers: report && report.blockers !== "ไม่มี" ? report.blockers : "",
    plan: report && report.plan !== "—" ? report.plan : "",
    status: report ? TH_TO_REPORT_STATUS[report.status] ?? "SUBMITTED" : "SUBMITTED",
    relatedTaskIds: report?.relatedTasks?.map((t) => t.id) ?? [],
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");

  // Default the report date to today in Asia/Bangkok, computed after mount to
  // stay hydration-safe. Only when creating and the user hasn't picked a date.
  useEffect(() => {
    if (mode !== "create") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => (v.date ? v : { ...v, date: bangkokDateISO() }));
  }, [mode]);

  // Default/prefill the project once the projects list is available.
  useEffect(() => {
    if (values.projectId || projects.length === 0) return;
    const initial =
      (report && projects.find((p) => p.name === report.proj)?.id) ||
      projects[0].id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => ({ ...v, projectId: initial }));
  }, [projects, report, values.projectId]);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /* ------------------------- Related task picker ------------------------ */

  // Ids of tasks assigned to the current user — surfaced first in the picker.
  const mineIds = useMemo(() => {
    const id = me?.id;
    if (!id) return new Set<string>();
    return new Set(
      tasks.filter((t) => t.assignees.some((a) => a.id === id)).map((t) => t.id)
    );
  }, [tasks, me?.id]);

  const toPick = (t: Task): PickTask => ({
    id: t.id,
    title: t.title,
    proj: t.proj,
    projColor: t.projFg,
    status: t.status,
  });

  // Selected tasks resolved for display: prefer the live board list, fall back
  // to what was linked when the report was loaded (covers deleted/hidden tasks).
  const selectedTasks: PickTask[] = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, toPick(t)]));
    const fromReport = new Map(
      (report?.relatedTasks ?? []).map((t) => [
        t.id,
        { id: t.id, title: t.title, proj: t.proj, projColor: t.projColor, status: t.status },
      ])
    );
    return values.relatedTaskIds.map(
      (id) => byId.get(id) ?? fromReport.get(id) ?? { id, title: id, proj: "?", projColor: "#71717a", status: "" }
    );
  }, [values.relatedTaskIds, tasks, report]);

  // Suggestions: with a query, search across all accessible tasks (mine first);
  // without one, suggest the current user's own tasks. Selected are excluded.
  const results: PickTask[] = useMemo(() => {
    const selected = new Set(values.relatedTaskIds);
    const q = taskSearch.trim().toLowerCase();
    const pool = tasks.filter((t) => !selected.has(t.id));
    const matched = q
      ? pool.filter(
          (t) =>
            t.title.toLowerCase().includes(q) || t.proj.toLowerCase().includes(q)
        )
      : pool.filter((t) => mineIds.has(t.id));
    return matched
      .sort((a, b) => Number(mineIds.has(b.id)) - Number(mineIds.has(a.id)))
      .slice(0, 8)
      .map(toPick);
  }, [tasks, taskSearch, values.relatedTaskIds, mineIds]);

  const addTask = (id: string) =>
    setValues((v) =>
      v.relatedTaskIds.includes(id)
        ? v
        : { ...v, relatedTaskIds: [...v.relatedTaskIds, id] }
    );
  const removeTask = (id: string) =>
    setValues((v) => ({
      ...v,
      relatedTaskIds: v.relatedTaskIds.filter((x) => x !== id),
    }));

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.projectId) next.projectId = "กรุณาเลือกโปรเจกต์";
    if (!values.did.trim()) next.did = "กรุณากรอกสิ่งที่ทำวันนี้";
    if (mode === "create" && !values.plan.trim())
      next.plan = "กรุณากรอกแผนสำหรับพรุ่งนี้";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(status: ReportStatusEnum) {
    if (!validate()) return;
    setSubmitting(true);
    const data: ReportInput = {
      projectId: values.projectId,
      did: values.did.trim(),
      blockers: values.blockers.trim(),
      plan: values.plan.trim(),
      status,
      // Always send the set so edits can add AND remove links (empty clears).
      relatedTaskIds: values.relatedTaskIds,
    };
    if (mode === "create") data.date = values.date;
    // Re-enable the form if the submit failed (dialog stays open on failure).
    setTimeout(async () => {
      const ok = await onSubmit(data);
      if (ok === false) setSubmitting(false);
    }, 300);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {mode === "create" && (
          <Field label="วันที่รายงาน">
            <Input
              type="date"
              value={values.date}
              onChange={(e) => set("date", e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              เลือกวันของรายงานได้ ทั้งล่วงหน้าและย้อนหลัง
            </p>
          </Field>
        )}
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
        {mode === "edit" && (
          <Field label="สถานะ">
            <Select
              value={values.status}
              onChange={(e) => set("status", e.target.value as ReportStatusEnum)}
            >
              {REPORT_STATUS_ENUM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="วันนี้ทำอะไรไปบ้าง?" error={errors.did}>
        <Textarea
          rows={4}
          value={values.did}
          onChange={(e) => set("did", e.target.value)}
          placeholder="สิ่งที่ทำเสร็จ รีวิวโค้ด หรือทำงานร่วมกับใคร…"
        />
      </Field>

      <Field label="ปัญหาหรืออุปสรรค" hint="ไม่บังคับ">
        <Textarea
          rows={2}
          value={values.blockers}
          onChange={(e) => set("blockers", e.target.value)}
          placeholder="มีอะไรที่ทำให้งานช้าลงไหม?"
        />
      </Field>

      <Field label="แผนสำหรับพรุ่งนี้" error={errors.plan}>
        <Textarea
          rows={3}
          value={values.plan}
          onChange={(e) => set("plan", e.target.value)}
          placeholder="สิ่งสำคัญ 1–3 อย่างที่จะทำต่อ"
        />
      </Field>

      {/* Optional related tasks — reports stay free-form; linking is a bonus. */}
      <Field label="งานที่เกี่ยวข้อง" hint="ไม่บังคับ">
        <div className="flex flex-col gap-2">
          {selectedTasks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTasks.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-[12px]"
                >
                  <span
                    className="flex-none font-mono text-[10px] font-semibold"
                    style={{ color: t.projColor }}
                  >
                    {t.proj}
                  </span>
                  <span className="min-w-0 truncate">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(t.id)}
                    className="flex-none text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                    aria-label={`เอา ${t.title} ออก`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Input
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="ค้นหางานเพื่อผูก (ชื่องานหรือโค้ดโปรเจกต์)…"
          />

          {results.length > 0 ? (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
              {results.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => addTask(t.id)}
                  className="flex w-full items-center gap-2 border-b border-hairline px-2.5 py-2 text-left text-[12.5px] transition-colors last:border-0 hover:bg-muted/50"
                >
                  <span
                    className="flex-none font-mono text-[10px] font-semibold"
                    style={{ color: t.projColor }}
                  >
                    {t.proj}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  {mineIds.has(t.id) && (
                    <span className="flex-none rounded bg-teal-50 px-1.5 py-px text-[10px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                      ของฉัน
                    </span>
                  )}
                  <span className="flex-none text-[10.5px] text-muted-foreground">
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          ) : taskSearch.trim() ? (
            <p className="text-[12px] text-muted-foreground">
              ไม่พบงานที่ตรงกับ “{taskSearch.trim()}”
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              พิมพ์เพื่อค้นหางาน แล้วเลือกงานที่เกี่ยวข้องกับรายงานนี้ (ถ้ามี)
            </p>
          )}
        </div>
      </Field>

      <FormActions>
        {mode === "create" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => submit("DRAFT")}
            >
              บันทึกฉบับร่าง
            </Button>
            <Button type="button" disabled={submitting} onClick={() => submit("SUBMITTED")}>
              {submitting ? "กำลังส่ง…" : "ส่งรายงาน"}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => submit(values.status)}
            >
              {submitting ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </>
        )}
      </FormActions>
    </div>
  );
}
