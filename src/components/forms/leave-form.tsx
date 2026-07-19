"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions } from "@/components/form-card";
import { bangkokDateISO } from "@/lib/thai-datetime";
import { useData } from "@/lib/store";
import { type LeaveInput } from "@/lib/mappers";

type Duration = "FULL" | "MORNING" | "AFTERNOON";

type Values = {
  type: string;
  duration: Duration;
  start: string;
  end: string;
  reason: string;
};

const EMPTY: Values = {
  type: "",
  duration: "FULL",
  // start/end are filled with today's Bangkok date on mount (hydration-safe).
  start: "",
  end: "",
  reason: "",
};

type LeaveFormProps = {
  onSubmit: (data: LeaveInput) => void;
  onCancel: () => void;
  /** whether half-day leave is enabled (from org settings); defaults to true */
  allowHalfDay?: boolean;
};

export function LeaveForm({ onSubmit, onCancel, allowHalfDay = true }: LeaveFormProps) {
  const { leaveTypes } = useData();
  const activeTypes = useMemo(
    () => leaveTypes.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [leaveTypes]
  );

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "range", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = bangkokDateISO();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => (v.start ? v : { ...v, start: today, end: today }));
  }, []);

  // Default the type to the first configured leave type once loaded.
  useEffect(() => {
    if (activeTypes.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => (v.type ? v : { ...v, type: activeTypes[0].name }));
  }, [activeTypes]);

  const isHalf = values.duration !== "FULL";

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };
      // Half-day is a single day: keep end pinned to start.
      if (key === "duration" && v !== "FULL") next.end = next.start;
      if (key === "start" && next.duration !== "FULL") next.end = next.start;
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined, range: undefined }));
  };

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.type) next.type = "กรุณาเลือกประเภทการลา";
    if (!values.reason.trim()) next.reason = "กรุณาระบุเหตุผล";
    if (!isHalf && new Date(values.end) < new Date(values.start))
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
      endDate: isHalf ? values.start : values.end,
      reason: values.reason.trim(),
      ...(isHalf ? { halfDayPeriod: values.duration as "MORNING" | "AFTERNOON" } : {}),
    };
    setTimeout(() => onSubmit(data), 300);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="ประเภทการลา" error={errors.type}>
        <Select value={values.type} onChange={(e) => set("type", e.target.value)}>
          {activeTypes.length === 0 && <option value="">— ไม่มีประเภทการลา —</option>}
          {activeTypes.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="ระยะเวลา">
        <Select
          value={values.duration}
          onChange={(e) => set("duration", e.target.value as Duration)}
        >
          <option value="FULL">เต็มวัน</option>
          {allowHalfDay && <option value="MORNING">ครึ่งวันเช้า</option>}
          {allowHalfDay && <option value="AFTERNOON">ครึ่งวันบ่าย</option>}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label={isHalf ? "วันที่ลา" : "วันที่เริ่ม"}>
          <Input
            type="date"
            value={values.start}
            onChange={(e) => set("start", e.target.value)}
          />
        </Field>
        {isHalf ? (
          <Field label="รวมเป็น">
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-muted/40 px-3 text-[13px] text-muted-foreground">
              0.5 วัน ({values.duration === "MORNING" ? "ครึ่งเช้า" : "ครึ่งบ่าย"})
            </div>
          </Field>
        ) : (
          <Field label="วันที่สิ้นสุด" error={errors.range}>
            <Input
              type="date"
              value={values.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="เหตุผล" error={errors.reason}>
        <Textarea
          rows={3}
          value={values.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="อธิบายสั้นๆ ให้หัวหน้าทีมทราบ"
        />
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
