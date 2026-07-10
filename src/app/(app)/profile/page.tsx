"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { FormCard, Field } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { updateStoredUser, type AuthUser } from "@/lib/auth";
import { roleNameOf, type ApiUser } from "@/lib/mappers";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ user: ApiUser }>("/api/profile")
      .then((r) => {
        setProfile(r.user);
        setName(r.user.name);
      })
      .catch(() => {});
  }, []);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("กรุณากรอกชื่อ");
      return;
    }
    setSavingInfo(true);
    try {
      const { user } = await api.patch<{ user: ApiUser }>("/api/profile", {
        name: name.trim(),
      });
      setProfile(user);
      updateStoredUser(user as unknown as AuthUser); // header/sidebar update live
      toast("บันทึกข้อมูลแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pw.next.length < 8) return setPwError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw.next !== pw.confirm) return setPwError("รหัสผ่านยืนยันไม่ตรงกัน");
    if (pw.next === pw.current) return setPwError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
    setSavingPw(true);
    try {
      await api.patch("/api/profile/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
        confirmPassword: pw.confirm,
      });
      toast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="flex justify-center px-7 py-6">
      <div className="flex w-[640px] max-w-full flex-col gap-4">
        <PageHeader eyebrow="MY PROFILE" title="โปรไฟล์ของฉัน" />

        {/* Profile header card */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Avatar userKey={profile?.avatarKey ?? "?"} size={56} fontSize={20} />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">
              {profile?.name ?? "…"}
            </div>
            <div className="truncate font-mono text-[12.5px] text-zinc-500">
              {profile?.email ?? ""}
            </div>
          </div>
          {profile && (
            <StatusBadge
              label={roleNameOf(profile.role)}
              colors={["#ccfbf1", "#0f766e"]}
              shape="tag"
            />
          )}
        </div>

        {/* Personal information */}
        <form onSubmit={saveInfo}>
          <FormCard>
            <div className="text-[13.5px] font-semibold">ข้อมูลส่วนตัว</div>
            <Field label="ชื่อ">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="อีเมล">
                <Input
                  value={profile?.email ?? ""}
                  disabled
                  className="bg-zinc-100 text-zinc-500"
                />
              </Field>
              <Field label="บทบาท">
                <Input
                  value={profile ? roleNameOf(profile.role) : ""}
                  disabled
                  className="bg-zinc-100 text-zinc-500"
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingInfo}>
                {savingInfo ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
              </Button>
            </div>
          </FormCard>
        </form>

        {/* Change password */}
        <form onSubmit={savePassword}>
          <FormCard>
            <div className="flex items-center justify-between">
              <div className="text-[13.5px] font-semibold">เปลี่ยนรหัสผ่าน</div>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-900"
              >
                {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPw ? "ซ่อน" : "แสดง"}รหัสผ่าน
              </button>
            </div>

            {pwError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                <TriangleAlert className="size-4 flex-none" />
                {pwError}
              </div>
            )}

            <Field label="รหัสผ่านปัจจุบัน">
              <Input
                type={showPw ? "text" : "password"}
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="ยืนยันรหัสผ่านใหม่">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPw}>
                {savingPw ? "กำลังบันทึก…" : "บันทึกรหัสผ่าน"}
              </Button>
            </div>
          </FormCard>
        </form>
      </div>
    </div>
  );
}
