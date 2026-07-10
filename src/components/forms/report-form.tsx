"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import {
  PROJECTS,
  REPORT_STATUS_OPTIONS,
  TEAM_MEMBERS,
  CURRENT_USER,
  type Report,
} from "@/lib/mock-data";

type Values = {
  date: string;
  proj: string;
  memberKey: string;
  did: string;
  blockers: string;
  plan: string;
  status: string;
};

function summarize(did: string) {
  const s = did.trim().replace(/\s+/g, " ");
  return s.length > 64 ? s.slice(0, 63) + "…" : s;
}

function buildReport(v: Values): Omit<Report, "id"> {
  const member =
    TEAM_MEMBERS.find((m) => m.key === v.memberKey) ?? {
      key: CURRENT_USER.key,
      name: CURRENT_USER.name,
    };
  return {
    date: v.date ? formatThaiDate(v.date) : "วันนี้",
    name: member.name,
    key: member.key,
    proj: v.proj,
    summary: summarize(v.did),
    status: v.status,
    did: v.did.trim(),
    blockers: v.blockers.trim() || "ไม่มี",
    plan: v.plan.trim() || "—",
  };
}

/** "2026-07-09" -> "9 ก.ค." */
function formatThaiDate(iso: string) {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

const EMPTY: Values = {
  date: "2026-07-09",
  proj: PROJECTS[0],
  memberKey: CURRENT_USER.key,
  did: "",
  blockers: "",
  plan: "",
  status: "ส่งแล้ว",
};

type ReportFormProps = {
  mode: "create" | "edit";
  /** For edit mode: existing report to prefill. */
  report?: Report;
  onSubmit: (data: Omit<Report, "id">) => void;
  onCancel: () => void;
};

export function ReportForm({ mode, report, onSubmit, onCancel }: ReportFormProps) {
  const initial: Values = report
    ? {
        date: "2026-07-09",
        proj: report.proj,
        memberKey: report.key,
        did: report.did,
        blockers: report.blockers === "ไม่มี" ? "" : report.blockers,
        plan: report.plan === "—" ? "" : report.plan,
        status: report.status,
      }
    : EMPTY;

  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.did.trim()) next.did = "กรุณากรอกสิ่งที่ทำวันนี้";
    if (!values.plan.trim()) next.plan = "กรุณากรอกแผนสำหรับพรุ่งนี้";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(status: string) {
    if (!validate()) return;
    setSubmitting(true);
    const data = buildReport({ ...values, status });
    // brief simulated save so the loading state is visible
    setTimeout(() => onSubmit(data), 450);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="วันที่รายงาน">
          <Input
            type="date"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="โปรเจกต์">
          <Select value={values.proj} onChange={(e) => set("proj", e.target.value)}>
            {PROJECTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
      </div>

      {mode === "edit" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="สมาชิก">
            <Select
              value={values.memberKey}
              onChange={(e) => set("memberKey", e.target.value)}
            >
              {TEAM_MEMBERS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="สถานะ">
            <Select
              value={values.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {REPORT_STATUS_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
      )}

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
        {mode === "create" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => submit("ฉบับร่าง")}
            >
              บันทึกฉบับร่าง
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => submit("ส่งแล้ว")}
            >
              {submitting ? "กำลังส่ง…" : "ส่งรายงาน"}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="button" disabled={submitting} onClick={() => submit(values.status)}>
              {submitting ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </>
        )}
      </FormActions>
    </div>
  );
}
