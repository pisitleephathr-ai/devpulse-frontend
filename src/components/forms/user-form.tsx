"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormActions } from "@/components/form-card";
import { ROLE_OPTIONS, type User } from "@/lib/mock-data";

type Values = { name: string; email: string; role: string };

/** Derive an avatar key from the email local part, e.g. "ben@x" -> "Ben". */
function keyFromEmail(email: string) {
  const local = email.split("@")[0] || "user";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

type UserFormProps = {
  mode: "create" | "edit";
  user?: User;
  onSubmit: (data: Omit<User, "id">) => void;
  onCancel: () => void;
};

export function UserForm({ mode, user, onSubmit, onCancel }: UserFormProps) {
  const initial: Values = user
    ? { name: user.name, email: user.email, role: user.role }
    : { name: "", email: "", role: ROLE_OPTIONS[2] };

  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.name.trim()) next.name = "กรุณากรอกชื่อ";
    if (!values.email.trim()) next.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = "รูปแบบอีเมลไม่ถูกต้อง";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    setSubmitting(true);
    const data: Omit<User, "id"> = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      key: user ? user.key : keyFromEmail(values.email.trim()),
      active: user ? user.active : true,
    };
    setTimeout(() => onSubmit(data), 400);
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
          placeholder="name@devpulse.io"
        />
      </Field>

      <Field label="บทบาท">
        <Select value={values.role} onChange={(e) => set("role", e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
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
