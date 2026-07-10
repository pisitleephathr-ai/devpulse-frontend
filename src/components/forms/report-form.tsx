"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import { useData } from "@/lib/store";
import { bangkokDateISO } from "@/lib/thai-datetime";
import {
  REPORT_STATUS_ENUM_OPTIONS,
  TH_TO_REPORT_STATUS,
  type ReportInput,
  type ReportStatusEnum,
} from "@/lib/mappers";
import type { Report } from "@/lib/mock-data";

type Values = {
  projectId: string;
  date: string;
  did: string;
  blockers: string;
  plan: string;
  status: ReportStatusEnum;
};

type ReportFormProps = {
  mode: "create" | "edit";
  report?: Report;
  onSubmit: (data: ReportInput) => void;
  onCancel: () => void;
};

export function ReportForm({ mode, report, onSubmit, onCancel }: ReportFormProps) {
  const { projects } = useData();

  const [values, setValues] = useState<Values>(() => ({
    projectId: "",
    // Filled on mount with today's Asia/Bangkok date (see effect below) so a
    // static prerender can't lock in a build-time day and shift it backward.
    date: "",
    did: report?.did ?? "",
    blockers: report && report.blockers !== "ไม่มี" ? report.blockers : "",
    plan: report && report.plan !== "—" ? report.plan : "",
    status: report ? TH_TO_REPORT_STATUS[report.status] ?? "SUBMITTED" : "SUBMITTED",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);

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
    };
    if (mode === "create") data.date = values.date;
    setTimeout(() => onSubmit(data), 300);
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
