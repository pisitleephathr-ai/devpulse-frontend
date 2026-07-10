"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import {
  LEAVE_TYPE_ENUM_OPTIONS,
  type LeaveTypeEnum,
  type LeaveInput,
} from "@/lib/mappers";

type Values = {
  type: LeaveTypeEnum;
  start: string;
  end: string;
  reason: string;
};

const EMPTY: Values = {
  type: "VACATION",
  start: "2026-07-27",
  end: "2026-07-31",
  reason: "",
};

type LeaveFormProps = {
  onSubmit: (data: LeaveInput) => void;
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
    const data: LeaveInput = {
      type: values.type,
      startDate: values.start,
      endDate: values.end,
      reason: values.reason.trim(),
    };
    setTimeout(() => onSubmit(data), 300);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="ประเภทการลา">
        <Select
          value={values.type}
          onChange={(e) => set("type", e.target.value as LeaveTypeEnum)}
        >
          {LEAVE_TYPE_ENUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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
          onClick={onCancel}
          disabled={submitting}
        >
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "กำลังส่ง…" : "ส่งคำขอ"}
        </Button>
      </FormActions>
    </div>
  );
}
