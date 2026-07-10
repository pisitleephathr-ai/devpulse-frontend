"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Building2, CalendarCheck, FileClock, Plane, Bell, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { thaiDateShortFromISO } from "@/lib/thai-datetime";

type Setting = {
  teamName: string;
  reportReminderTime: string;
  timezone: string;
  workingDays: string;
  reportDueTime: string;
  requireDailyReportDefault: boolean;
  allowHalfDayLeave: boolean;
  notifyReportReminder: boolean;
  notifyLeaveApproval: boolean;
  notifyTaskDue: boolean;
  menuOrder: string;
};

type LeaveType = {
  id: string;
  name: string;
  daysLabel: string;
  color: string;
  autoApprove: boolean;
  sortOrder: number;
};

type Holiday = {
  id: string;
  name: string;
  date: string;
  description: string;
  type: string;
  isActive: boolean;
};

const REMINDER_OPTIONS = ["16:30 น.", "17:00 น.", "17:30 น."];
const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const HOLIDAY_TYPE_LABEL: Record<string, string> = {
  COMPANY: "วันหยุดบริษัท",
  PUBLIC: "วันหยุดราชการ",
  SPECIAL: "วันหยุดพิเศษ",
};

const DEFAULT_SETTING: Setting = {
  teamName: "",
  reportReminderTime: REMINDER_OPTIONS[0],
  timezone: "Asia/Bangkok",
  workingDays: "1,2,3,4,5",
  reportDueTime: "08:30",
  requireDailyReportDefault: true,
  allowHalfDayLeave: true,
  notifyReportReminder: true,
  notifyLeaveApproval: true,
  notifyTaskDue: true,
  menuOrder: "",
};

export default function SettingsPage() {
  const [setting, setSetting] = useState<Setting>(DEFAULT_SETTING);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [saving, setSaving] = useState(false);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [pendingLeaveDelete, setPendingLeaveDelete] = useState<LeaveType | null>(null);
  const [pendingHolidayDelete, setPendingHolidayDelete] = useState<Holiday | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ setting: Setting }>("/api/settings").then((r) =>
        setSetting({ ...DEFAULT_SETTING, ...r.setting })
      ),
      api
        .get<{ leaveTypes: LeaveType[] }>("/api/settings/leave-types")
        .then((r) => setLeaveTypes(r.leaveTypes)),
      api
        .get<{ holidays: Holiday[] }>("/api/settings/holidays")
        .then((r) => setHolidays(r.holidays)),
    ])
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof Setting>(k: K, v: Setting[K]) =>
    setSetting((s) => ({ ...s, [k]: v }));

  const workingSet = new Set(
    setting.workingDays.split(",").filter(Boolean).map(Number)
  );
  function toggleWorkingDay(d: number) {
    const next = new Set(workingSet);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    set("workingDays", [...next].sort((a, b) => a - b).join(","));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await api.patch("/api/settings", setting);
      toast("บันทึกการตั้งค่าแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLeaveType(lt: LeaveType) {
    try {
      await api.del(`/api/settings/leave-types/${lt.id}`);
      setLeaveTypes((prev) => prev.filter((x) => x.id !== lt.id));
      toast("เก็บถาวรประเภทการลาแล้ว");
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 409
          ? "ไม่สามารถลบประเภทการลานี้ได้ เนื่องจากมีคำขอลาที่ใช้งานอยู่"
          : err instanceof ApiError
          ? err.message
          : "ลบไม่สำเร็จ"
      );
    }
  }

  async function deleteHoliday(h: Holiday) {
    try {
      await api.del(`/api/settings/holidays/${h.id}`);
      setHolidays((prev) => prev.filter((x) => x.id !== h.id));
      toast("ลบวันหยุดแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="flex justify-center px-4 py-6 sm:px-7">
      <div className="flex w-[680px] max-w-full flex-col gap-4">
        <PageHeader eyebrow="SETTINGS" title="ตั้งค่าองค์กร" />

        {!loaded ? (
          <FormSkeleton sections={3} />
        ) : (
          <>
            {/* Organization */}
            <Section icon={<Building2 className="size-4" />} title="ข้อมูลองค์กร" desc="ชื่อทีมและเขตเวลาที่ใช้กับทั้งระบบ">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="ชื่อทีม / องค์กร">
                  <Input value={setting.teamName} onChange={(e) => set("teamName", e.target.value)} />
                </Field>
                <Field label="เขตเวลา">
                  <Select value={setting.timezone} onChange={(e) => set("timezone", e.target.value)}>
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="UTC">UTC</option>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* Working days */}
            <Section icon={<CalendarCheck className="size-4" />} title="วันทำงาน" desc="เลือกวันที่ถือเป็นวันทำงาน วันที่เหลือจะแสดงเป็นวันหยุดในปฏิทิน">
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((label, d) => {
                  const on = workingSet.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWorkingDay(d)}
                      className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                        on
                          ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Daily report */}
            <Section icon={<FileClock className="size-4" />} title="รายงานประจำวัน" desc="กำหนดเวลาส่งและการแจ้งเตือนรายงาน">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="กำหนดส่งก่อน (เวลา)">
                  <Input type="time" value={setting.reportDueTime} onChange={(e) => set("reportDueTime", e.target.value)} />
                </Field>
                <Field label="เวลาแจ้งเตือนส่งรายงาน">
                  <Select value={setting.reportReminderTime} onChange={(e) => set("reportReminderTime", e.target.value)}>
                    {(REMINDER_OPTIONS.includes(setting.reportReminderTime)
                      ? REMINDER_OPTIONS
                      : [setting.reportReminderTime, ...REMINDER_OPTIONS]
                    ).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Toggle
                label="กำหนดให้ผู้ใช้ใหม่ต้องส่งรายงานประจำวัน"
                checked={setting.requireDailyReportDefault}
                onChange={(v) => set("requireDailyReportDefault", v)}
              />
            </Section>

            {/* Leave */}
            <Section
              icon={<Plane className="size-4" />}
              title="การลา"
              desc="เปิด/ปิดการลาครึ่งวัน และจัดการประเภทการลา"
              action={
                <button
                  onClick={() => setAddLeaveOpen(true)}
                  className="flex items-center gap-1 rounded-[7px] border border-border px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                >
                  <Plus className="size-3.5" /> เพิ่มประเภท
                </button>
              }
            >
              <Toggle
                label="อนุญาตการลาครึ่งวัน (เช้า / บ่าย)"
                checked={setting.allowHalfDayLeave}
                onChange={(v) => set("allowHalfDayLeave", v)}
              />
              <div className="mt-3 divide-y divide-hairline-soft rounded-lg border border-border">
                {leaveTypes.map((lt) => (
                  <div key={lt.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="size-2.5 flex-none rounded-[3px]" style={{ background: lt.color }} />
                    <span className="flex-1 truncate text-[13px] font-medium">{lt.name}</span>
                    <span className="text-[12px] text-muted-foreground">{lt.daysLabel}</span>
                    <span
                      className="rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                      style={
                        lt.autoApprove
                          ? { background: "#dcfce7", color: "#15803d" }
                          : { background: "#fef3c7", color: "#b45309" }
                      }
                    >
                      {lt.autoApprove ? "อนุมัติอัตโนมัติ" : "ต้องขออนุมัติ"}
                    </span>
                    <button
                      onClick={() => setPendingLeaveDelete(lt)}
                      className="flex size-7 items-center justify-center rounded-[7px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="ลบประเภทการลา"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                {leaveTypes.length === 0 && (
                  <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">ยังไม่มีประเภทการลา</div>
                )}
              </div>
            </Section>

            {/* Notifications */}
            <Section icon={<Bell className="size-4" />} title="การแจ้งเตือน" desc="เลือกการแจ้งเตือนที่ต้องการเปิดใช้งาน">
              <Toggle label="แจ้งเตือนให้ส่งรายงานประจำวัน" checked={setting.notifyReportReminder} onChange={(v) => set("notifyReportReminder", v)} />
              <Toggle label="แจ้งเตือนการอนุมัติคำขอลา" checked={setting.notifyLeaveApproval} onChange={(v) => set("notifyLeaveApproval", v)} />
              <Toggle label="แจ้งเตือนงานที่ใกล้ครบกำหนด" checked={setting.notifyTaskDue} onChange={(v) => set("notifyTaskDue", v)} />
            </Section>

            {/* Save bar for all TeamSetting fields */}
            <div className="sticky bottom-4 flex justify-end">
              <Button type="button" onClick={saveSettings} disabled={saving} className="shadow-lg">
                {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
              </Button>
            </div>

            {/* Company holidays */}
            <Section
              icon={<CalendarOff className="size-4" />}
              title="วันหยุดบริษัท"
              desc="วันหยุดจะแสดงบนปฏิทิน แยกจากงาน/รายงาน/การลา"
              action={
                <button
                  onClick={() => setAddHolidayOpen(true)}
                  className="flex items-center gap-1 rounded-[7px] border border-border px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                >
                  <Plus className="size-3.5" /> เพิ่มวันหยุด
                </button>
              }
            >
              <div className="divide-y divide-hairline-soft rounded-lg border border-border">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/40">
                      <CalendarOff className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{h.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {thaiDateShortFromISO(h.date.slice(0, 10))}
                        {h.description ? ` · ${h.description}` : ""}
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      {HOLIDAY_TYPE_LABEL[h.type] ?? h.type}
                    </span>
                    <button
                      onClick={() => setPendingHolidayDelete(h)}
                      className="flex size-7 items-center justify-center rounded-[7px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="ลบวันหยุด"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                {holidays.length === 0 && (
                  <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">ยังไม่มีวันหยุดบริษัท</div>
                )}
              </div>
            </Section>
          </>
        )}
      </div>

      <AddLeaveTypeDialog
        open={addLeaveOpen}
        onClose={() => setAddLeaveOpen(false)}
        onCreated={(lt) => setLeaveTypes((prev) => [...prev, lt].sort((a, b) => a.sortOrder - b.sortOrder))}
        nextOrder={leaveTypes.length}
      />
      <AddHolidayDialog
        open={addHolidayOpen}
        onClose={() => setAddHolidayOpen(false)}
        onCreated={(h) => setHolidays((prev) => [...prev, h].sort((a, b) => a.date.localeCompare(b.date)))}
      />

      <ConfirmDialog
        open={pendingLeaveDelete !== null}
        onClose={() => setPendingLeaveDelete(null)}
        onConfirm={() => pendingLeaveDelete && deleteLeaveType(pendingLeaveDelete)}
        title="เก็บถาวรประเภทการลานี้?"
        message={`ประเภท "${pendingLeaveDelete?.name}" จะถูกซ่อนจากการเลือกใหม่ แต่คำขอลาเดิมจะไม่ได้รับผลกระทบ`}
        confirmLabel="เก็บถาวร"
        destructive
      />
      <ConfirmDialog
        open={pendingHolidayDelete !== null}
        onClose={() => setPendingHolidayDelete(null)}
        onConfirm={() => pendingHolidayDelete && deleteHoliday(pendingHolidayDelete)}
        title="ลบวันหยุดนี้?"
        message={`ต้องการลบ "${pendingHolidayDelete?.name}" ออกจากปฏิทินใช่หรือไม่`}
        confirmLabel="ลบวันหยุด"
        destructive
      />
    </div>
  );
}

/* ------------------------------- pieces -------------------------------- */

function Section({
  icon,
  title,
  desc,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40">
            {icon}
          </span>
          <div>
            <div className="text-[14px] font-semibold">{title}</div>
            {desc && <div className="mt-0.5 text-[12px] text-muted-foreground">{desc}</div>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-[13px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[22px] w-[38px] flex-none rounded-full transition-colors ${
          checked ? "bg-teal-600" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}

function AddLeaveTypeDialog({
  open,
  onClose,
  onCreated,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (lt: LeaveType) => void;
  nextOrder: number;
}) {
  const [name, setName] = useState("");
  const [daysLabel, setDaysLabel] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [autoApprove, setAutoApprove] = useState("false");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !daysLabel.trim()) {
      setError("กรุณากรอกชื่อและจำนวนวัน");
      return;
    }
    setSaving(true);
    try {
      const { leaveType } = await api.post<{ leaveType: LeaveType }>("/api/settings/leave-types", {
        name: name.trim(),
        daysLabel: daysLabel.trim(),
        color,
        autoApprove: autoApprove === "true",
        sortOrder: nextOrder,
      });
      onCreated(leaveType);
      toast("เพิ่มประเภทการลาแล้ว");
      setName("");
      setDaysLabel("");
      setColor("#0d9488");
      setAutoApprove("false");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="เพิ่มประเภทการลา"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "กำลังเพิ่ม…" : "เพิ่มประเภท"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <Field label="ชื่อประเภท">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ลาไปอบรม" />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="จำนวนวัน">
            <Input value={daysLabel} onChange={(e) => setDaysLabel(e.target.value)} placeholder="เช่น 5 วัน / ปี" />
          </Field>
          <Field label="การอนุมัติ">
            <Select value={autoApprove} onChange={(e) => setAutoApprove(e.target.value)}>
              <option value="false">ต้องขออนุมัติ</option>
              <option value="true">อนุมัติอัตโนมัติ</option>
            </Select>
          </Field>
        </div>
        <Field label="สี">
          <div className="flex items-center gap-2.5">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-9 cursor-pointer rounded border border-border bg-card p-0.5" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-32 font-mono" />
          </div>
        </Field>
      </div>
    </Dialog>
  );
}

function AddHolidayDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (h: Holiday) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("COMPANY");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !date) {
      setError("กรุณากรอกชื่อวันหยุดและวันที่");
      return;
    }
    setSaving(true);
    try {
      const { holiday } = await api.post<{ holiday: Holiday }>("/api/settings/holidays", {
        name: name.trim(),
        date,
        description: description.trim(),
        type,
      });
      onCreated(holiday);
      toast("เพิ่มวันหยุดแล้ว");
      setName("");
      setDate("");
      setDescription("");
      setType("COMPANY");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เพิ่มไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="เพิ่มวันหยุดบริษัท"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "กำลังเพิ่ม…" : "เพิ่มวันหยุด"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="ชื่อวันหยุด">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น วันสงกรานต์" />
          </Field>
          <Field label="วันที่">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="ประเภท">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="COMPANY">วันหยุดบริษัท</option>
            <option value="PUBLIC">วันหยุดราชการ</option>
            <option value="SPECIAL">วันหยุดพิเศษ</option>
          </Select>
        </Field>
        <Field label="รายละเอียด (ไม่บังคับ)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
        </Field>
      </div>
    </Dialog>
  );
}
