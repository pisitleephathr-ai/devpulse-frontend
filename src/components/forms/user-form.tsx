"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormActions } from "@/components/form-card";
import { useData } from "@/lib/store";
import { roleNameOf } from "@/lib/mappers";
import type { User } from "@/lib/mock-data";

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  requiresDailyReport: boolean;
};

type UserFormProps = {
  mode: "create" | "edit";
  user?: User;
  onSubmit: (data: UserFormValues) => void | Promise<boolean | void>;
  onCancel: () => void;
};

export function UserForm({ mode, user, onSubmit, onCancel }: UserFormProps) {
  const { roles } = useData();

  // Active roles for selection; when editing, keep the user's current role even
  // if it has since been deactivated.
  const options = useMemo(() => {
    const list = roles.filter((r) => r.isActive);
    if (user) {
      const current = roles.find((r) => r.code === user.roleCode);
      if (current && !list.some((r) => r.id === current.id)) list.unshift(current);
    }
    return list;
  }, [roles, user]);

  const [values, setValues] = useState<UserFormValues>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    roleId: "",
    requiresDailyReport: user?.requiresDailyReport ?? true,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Default the role once roles load (or match the editing user's role).
  const roleId =
    values.roleId ||
    (user && options.find((r) => r.code === user.roleCode)?.id) ||
    options[0]?.id ||
    "";

  const set = <K extends keyof UserFormValues>(key: K, v: UserFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof UserFormValues, string>> = {};
    if (!values.name.trim()) next.name = "กรุณากรอกชื่อ";
    if (mode === "create") {
      if (!values.email.trim()) next.email = "กรุณากรอกอีเมล";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
        next.email = "รูปแบบอีเมลไม่ถูกต้อง";
      if (values.password.length < 6)
        next.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }
    if (!roleId) next.roleId = "กรุณาเลือกบทบาท";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(async () => {
      const ok = await onSubmit({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        roleId,
        requiresDailyReport: values.requiresDailyReport,
      });
      if (ok === false) setSubmitting(false);
    }, 300);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="ชื่อ" error={errors.name}>
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="เช่น เบน คาร์เตอร์"
        />
      </Field>

      <Field label="อีเมล" error={errors.email}>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          disabled={mode === "edit"}
          placeholder="name@devpulse.io"
          className={mode === "edit" ? "bg-zinc-100 text-zinc-500" : ""}
        />
      </Field>

      {mode === "create" && (
        <Field label="รหัสผ่านเริ่มต้น" error={errors.password}>
          <Input
            type="password"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
          />
        </Field>
      )}

      <Field label="บทบาท" error={errors.roleId}>
        {roles.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12.5px] text-zinc-400">
            กำลังโหลดบทบาท…
          </div>
        ) : (
          <Select value={roleId} onChange={(e) => set("roleId", e.target.value)}>
            {options.map((r) => (
              <option key={r.id} value={r.id}>
                {roleNameOf(r)}
                {!r.isActive ? " (ปิดใช้งาน)" : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
        <input
          type="checkbox"
          checked={values.requiresDailyReport}
          onChange={(e) => set("requiresDailyReport", e.target.checked)}
          className="mt-0.5 size-[15px] flex-none accent-teal-600"
        />
        <span>
          <span className="block text-[13px] font-medium text-zinc-800">
            ต้องส่งรายงานประจำวัน
          </span>
          <span className="block text-[11.5px] text-zinc-500">
            ปิดตัวเลือกนี้สำหรับผู้ใช้ที่ไม่จำเป็นต้องส่งรายงานทุกวัน
          </span>
        </span>
      </label>

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
          {submitting
            ? "กำลังบันทึก…"
            : mode === "create"
              ? "ส่งคำเชิญ"
              : "บันทึก"}
        </Button>
      </FormActions>
    </div>
  );
}
