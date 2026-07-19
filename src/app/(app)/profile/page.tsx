"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  TriangleAlert,
  ShieldAlert,
  MessageCircle,
  RefreshCw,
  Send,
  Unlink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { FormCard, Field } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ProfileSkeleton } from "@/components/skeletons";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { updateStoredUser, type AuthUser } from "@/lib/auth";
import { roleNameOf, type ApiUser } from "@/lib/mappers";

type LinePrefs = {
  taskAssigned: boolean;
  leaveDecision: boolean;
  reportReminder: boolean;
};
type LineStatus = {
  linked: boolean;
  linkedAt: string | null;
  lineEnabled: boolean;
  addFriendUrl: string | null;
  prefs: LinePrefs;
};
type LinkCode = { code: string; expiresAt: string; addFriendUrl: string | null };

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatThaiTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [line, setLine] = useState<LineStatus | null>(null);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [lineBusy, setLineBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ user: ApiUser }>("/api/profile")
      .then((r) => {
        setProfile(r.user);
        setName(r.user.name);
      })
      .catch(() => {});
    refreshLine();
  }, []);

  async function refreshLine() {
    try {
      const s = await api.get<LineStatus>("/api/profile/line");
      setLine(s);
      if (s.linked) setLinkCode(null); // linked → hide any lingering code
    } catch {
      /* leave status unknown; card stays hidden until it loads */
    }
  }

  async function generateLinkCode() {
    setLineBusy(true);
    try {
      const c = await api.post<LinkCode>("/api/profile/line/link-code");
      setLinkCode(c);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "สร้างรหัสไม่สำเร็จ");
    } finally {
      setLineBusy(false);
    }
  }

  async function sendTestDm() {
    setLineBusy(true);
    try {
      await api.post("/api/profile/line/test");
      toast("ส่งข้อความทดสอบแล้ว — ตรวจสอบ LINE ของคุณ");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setLineBusy(false);
    }
  }

  async function unlinkLine() {
    setLineBusy(true);
    try {
      await api.del("/api/profile/line");
      setLinkCode(null);
      await refreshLine();
      toast("ยกเลิกการเชื่อมต่อ LINE แล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ยกเลิกไม่สำเร็จ");
    } finally {
      setLineBusy(false);
    }
  }

  async function updatePref(key: keyof LinePrefs, value: boolean) {
    if (!line) return;
    const prev = line.prefs;
    // Optimistic — revert on failure.
    setLine({ ...line, prefs: { ...prev, [key]: value } });
    try {
      const { prefs } = await api.patch<{ prefs: LinePrefs }>(
        "/api/profile/line/prefs",
        { [key]: value }
      );
      setLine((l) => (l ? { ...l, prefs } : l));
    } catch (err) {
      setLine((l) => (l ? { ...l, prefs: prev } : l));
      toast(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    }
  }

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

        {!profile ? (
          <ProfileSkeleton />
        ) : (
        <>
        {/* Profile header card */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Avatar userKey={profile?.avatarKey ?? "?"} name={profile?.name} size={56} fontSize={20} />
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

        {/* Security reminder — encourage changing the initial password. */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert className="mt-0.5 size-4 flex-none text-amber-600" />
          <div className="text-[12.5px] leading-relaxed text-amber-900">
            <strong>เพื่อความปลอดภัย</strong> — หากคุณยังใช้รหัสผ่านเริ่มต้นที่ผู้ดูแลตั้งให้
            กรุณาเปลี่ยนรหัสผ่านใหม่ด้านล่างนี้
          </div>
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

        {/* Personal LINE linking */}
        {line && (
          <FormCard>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-teal-600" />
              <div className="text-[13.5px] font-semibold">เชื่อมต่อ LINE ส่วนตัว</div>
              {line.linked && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11.5px] font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <CheckCircle2 className="size-3" /> เชื่อมต่อแล้ว
                </span>
              )}
            </div>

            {line.linked ? (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  บัญชี LINE ของคุณเชื่อมต่อแล้ว
                  {line.linkedAt && ` เมื่อ ${formatThaiDate(line.linkedAt)}`} —
                  เลือกได้ว่าจะรับแจ้งเตือนอะไรบ้างทาง LINE ส่วนตัว
                </p>

                {/* Per-user DM preferences */}
                <div className="divide-y divide-hairline rounded-xl border border-hairline">
                  <SwitchRow
                    label="งานที่ได้รับมอบหมาย"
                    hint="เมื่อมีคนมอบหมายงานให้คุณ"
                    checked={line.prefs.taskAssigned}
                    onChange={(v) => updatePref("taskAssigned", v)}
                  />
                  <SwitchRow
                    label="ผลอนุมัติการลา"
                    hint="เมื่อคำขอลาของคุณถูกอนุมัติ/ปฏิเสธ"
                    checked={line.prefs.leaveDecision}
                    onChange={(v) => updatePref("leaveDecision", v)}
                  />
                  <SwitchRow
                    label="เตือนส่งรายงานประจำวัน"
                    hint="เมื่อผู้จัดการกดเตือนและคุณยังไม่ส่ง"
                    checked={line.prefs.reportReminder}
                    onChange={(v) => updatePref("reportReminder", v)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={sendTestDm} disabled={lineBusy}>
                    <Send className="size-3.5" /> ส่งข้อความทดสอบ
                  </Button>
                  <Button variant="ghost" onClick={unlinkLine} disabled={lineBusy}>
                    <Unlink className="size-3.5" /> ยกเลิกการเชื่อมต่อ
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  เชื่อมต่อเพื่อรับแจ้งเตือนส่วนตัว (งานที่ได้รับมอบหมาย, ผลอนุมัติลา) ทาง LINE
                  ของคุณ ทำได้โดยสร้างรหัสด้านล่าง แล้วส่งรหัสนั้นในแชท LINE OA ของทีม
                </p>

                {!line.lineEnabled && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <TriangleAlert className="mt-0.5 size-3.5 flex-none" />
                    ระบบ LINE ยังไม่ถูกเปิดใช้งานโดยผู้ดูแล — สร้างรหัสไว้ได้ แต่การยืนยันจะทำงานเมื่อเปิดระบบแล้ว
                  </div>
                )}

                {line.addFriendUrl && (
                  <a
                    href={line.addFriendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-teal-600 hover:underline"
                  >
                    <MessageCircle className="size-3.5" /> เพิ่มเพื่อน LINE OA ของทีมก่อน ↗
                  </a>
                )}

                {linkCode ? (
                  <div className="rounded-xl border border-hairline bg-muted/40 p-4">
                    <div className="text-[11.5px] text-muted-foreground">
                      ส่งรหัสนี้ในแชท LINE OA ของทีม
                    </div>
                    <div className="mt-1 select-all font-mono text-[28px] font-bold tracking-[0.3em] text-foreground">
                      {linkCode.code}
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      รหัสหมดอายุเวลา {formatThaiTime(linkCode.expiresAt)} น. (ภายใน 10 นาที)
                    </div>
                    <ol className="mt-3 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-muted-foreground">
                      <li>เปิดแชท LINE OA ของทีม (เพิ่มเพื่อนก่อนหากยังไม่ได้เพิ่ม)</li>
                      <li>พิมพ์/วางรหัสด้านบนแล้วส่ง</li>
                      <li>บอทจะตอบยืนยัน แล้วกด “ฉันเชื่อมต่อแล้ว” ด้านล่าง</li>
                    </ol>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={refreshLine} disabled={lineBusy}>
                        <RefreshCw className="size-3.5" /> ฉันเชื่อมต่อแล้ว
                      </Button>
                      <Button variant="ghost" onClick={generateLinkCode} disabled={lineBusy}>
                        สร้างรหัสใหม่
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Button onClick={generateLinkCode} disabled={lineBusy}>
                      {lineBusy ? "กำลังสร้าง…" : "สร้างรหัสเชื่อมต่อ"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </FormCard>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={() => onChange(!checked)} label={label} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex h-6 w-11 flex-none shrink-0 items-center rounded-full px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-60 ${
        checked ? "bg-teal-600" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
