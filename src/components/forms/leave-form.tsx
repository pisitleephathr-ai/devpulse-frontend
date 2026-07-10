"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import {
  LEAVE_TYPES_FORM,
  CURRENT_USER,
  type Leave,
} from "@/lib/mock-data";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function fmt(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function rangeLabel(start: string, end: string) {
  if (start === end) return fmt(start);
  const [, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  if (m1 === m2) return `${d1}–${d2} ${MONTHS[m1 - 1]}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

type Values = { type: string; start: string; end: string; reason: string };

const EMPTY: Values = {
  type: LEAVE_TYPES_FORM[0],
  start: "2026-07-27",
  end: "2026-07-31",
  reason: "",
};

type LeaveFormProps = {
  onSubmit: (data: Omit<Leave, "id">) => void;
  onCancel: () => void;
};

export function LeaveForm({ onSubmit, onCancel }: LeaveFormProps) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "range", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined, range: undefined }));
  };

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.reason.trim()) next.reason = "กรุณาระบุเหตุผล";
    if (new Date(values.end) < new Date(values.start))
      next.range = "วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่ม";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    setSubmitting(true);
    const data: Omit<Leave, "id"> = {
      name: CURRENT_USER.name,
      key: CURRENT_USER.key,
      type: values.type,
      dates: rangeLabel(values.start, values.end),
      days: daysBetween(values.start, values.end),
      reason: values.reason.trim(),
      status: "รออนุมัติ",
    };
    setTimeout(() => onSubmit(data), 450);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="ประเภทการลา">
        <Select value={values.type} onChange={(e) => set("type", e.target.value)}>
          {LEAVE_TYPES_FORM.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="วันที่เริ่ม">
          <Input
            type="date"
            value={values.start}
            onChange={(e) => set("start", e.target.value)}
          />
        </Field>
        <Field label="วันที่สิ้นสุด" error={errors.range}>
          <Input
            type="date"
            value={values.end}
            onChange={(e) => set("end", e.target.value)}
          />
        </Field>
      </div>

      <Field label="เหตุผล" error={errors.reason}>
        <Textarea
          rows={3}
          value={values.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="อธิบายสั้นๆ ให้หัวหน้าทีมทราบ"
        />
      </Field>

      <Field label="ไฟล์แนบ" hint="ไม่บังคับ">
        <div className="cursor-pointer rounded-lg border-[1.5px] border-dashed border-zinc-300 p-[18px] text-center text-[12.5px] text-zinc-400 transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-600">
          วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </div>
      </Field>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => {
            setValues(EMPTY);
            setErrors({});
          }}
        >
          รีเซ็ต
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "กำลังส่ง…" : "ส่งคำขอ"}
        </Button>
      </FormActions>
    </div>
  );
}
