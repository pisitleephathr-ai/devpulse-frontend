"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Building2,
  CalendarCheck,
  FileClock,
  Plane,
  Bell,
  CalendarOff,
  Clock,
  ClipboardList,
  MessageCircle,
  Pencil,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { TASK_STATUS_ENUM_OPTIONS } from "@/lib/mappers";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/upload-config";
import { thaiDateShortFromISO, nextMonthFirstThai } from "@/lib/thai-datetime";

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
  linePersonalEnabled: boolean;
  lineNotifyNewTask: boolean;
  lineNotifyStatuses: string[];
  lineNotifyLeave: boolean;
  lineDailyLeaveSummary: boolean;
  lineDailyLeaveSummaryTime: string;
  lineDailyReportSummary: boolean;
  lineDailyReportSummaryTime: string;
};
type LeaveType = { id: string; name: string; daysLabel: string; color: string; autoApprove: boolean; sortOrder: number };
type Holiday = { id: string; name: string; date: string; description: string; type: string; isActive: boolean };

const REMINDER_OPTIONS = ["16:30 น.", "17:00 น.", "17:30 น."];
const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const HOLIDAY_TYPE_LABEL: Record<string, string> = { COMPANY: "วันหยุดบริษัท", PUBLIC: "วันหยุดราชการ", SPECIAL: "วันหยุดพิเศษ" };

// TeamSetting-only fields (menu config is saved separately).
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
  linePersonalEnabled: true,
  lineNotifyNewTask: true,
  lineNotifyStatuses: ["TODO", "DONE"],
  lineNotifyLeave: true,
  lineDailyLeaveSummary: false,
  lineDailyLeaveSummaryTime: "09:00",
  lineDailyReportSummary: false,
  lineDailyReportSummaryTime: "18:00",
};
const SETTING_KEYS = Object.keys(DEFAULT_SETTING) as (keyof Setting)[];
const pickSetting = (s: Record<string, unknown>): Setting =>
  Object.fromEntries(SETTING_KEYS.map((k) => [k, s[k]])) as Setting;

export default function SettingsPage() {

  const [setting, setSetting] = useState<Setting>(DEFAULT_SETTING);
  const [baseline, setBaseline] = useState<Setting>(DEFAULT_SETTING);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [saving, setSaving] = useState(false);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveType | null>(null);
  const [testingSummary, setTestingSummary] = useState<"leave" | "report" | null>(null);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [pendingLeaveDelete, setPendingLeaveDelete] = useState<LeaveType | null>(null);
  const [pendingHolidayDelete, setPendingHolidayDelete] = useState<Holiday | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lineStatus, setLineStatus] = useState<{
    enabled: boolean;
    groupConnected: boolean;
    quota?: {
      type: "limited" | "none";
      value: number | null;
      used: number;
      remaining: number | null;
    } | null;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api
        .get<{
          setting: Record<string, unknown>;
          line?: {
            enabled: boolean;
            groupConnected: boolean;
            quota?: {
              type: "limited" | "none";
              value: number | null;
              used: number;
              remaining: number | null;
            } | null;
          };
        }>("/api/settings")
        .then((r) => {
          const s = { ...DEFAULT_SETTING, ...pickSetting(r.setting) };
          setSetting(s);
          setBaseline(s);
          setLineStatus(r.line ?? null);
        }),
      api.get<{ leaveTypes: LeaveType[] }>("/api/settings/leave-types").then((r) => setLeaveTypes(r.leaveTypes)),
      api.get<{ holidays: Holiday[] }>("/api/settings/holidays").then((r) => setHolidays(r.holidays)),
    ])
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof Setting>(k: K, v: Setting[K]) => setSetting((s) => ({ ...s, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(setting) !== JSON.stringify(baseline), [setting, baseline]);

  const workingSet = new Set(setting.workingDays.split(",").filter(Boolean).map(Number));
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
      setBaseline(setting);
      toast("บันทึกการตั้งค่าแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function testSummary(kind: "leave" | "report") {
    setTestingSummary(kind);
    try {
      const r = await api.post<{ sent: boolean; reason?: string }>(`/api/settings/line/test/${kind}`, {});
      toast(r.sent ? "ส่งทดสอบเข้ากลุ่ม LINE แล้ว ✓" : r.reason ?? "ส่งทดสอบไม่สำเร็จ");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ส่งทดสอบไม่สำเร็จ");
    } finally {
      setTestingSummary(null);
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
    <div className="px-4 py-6 sm:px-7">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="SETTINGS" title="ตั้งค่าองค์กร" description="กำหนดค่าองค์กร นโยบายการลา และวันหยุด" />

        {!loaded ? (
          <div className="mt-4">
            <FormSkeleton sections={4} />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {/* Left column */}
              <div className="flex flex-col gap-4">
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

                <Section icon={<CalendarCheck className="size-4" />} title="วันทำงาน" desc="วันที่เหลือจะแสดงเป็นวันหยุดในปฏิทิน">
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((label, d) => {
                      const on = workingSet.has(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleWorkingDay(d)}
                          aria-pressed={on}
                          className={`min-w-[64px] rounded-lg border px-3 py-1.5 text-center text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
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

                <Section icon={<FileClock className="size-4" />} title="รายงานประจำวัน" desc="กำหนดเวลาส่งและการแจ้งเตือน">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field label="กำหนดส่งก่อน (เวลา)">
                      <Input type="time" value={setting.reportDueTime} onChange={(e) => set("reportDueTime", e.target.value)} />
                    </Field>
                    <Field label="เวลาแจ้งเตือนส่งรายงาน">
                      <Select value={setting.reportReminderTime} onChange={(e) => set("reportReminderTime", e.target.value)}>
                        {(REMINDER_OPTIONS.includes(setting.reportReminderTime) ? REMINDER_OPTIONS : [setting.reportReminderTime, ...REMINDER_OPTIONS]).map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="mt-1 divide-y divide-hairline-soft">
                    <SwitchRow label="กำหนดให้ผู้ใช้ใหม่ต้องส่งรายงานประจำวัน" checked={setting.requireDailyReportDefault} onChange={(v) => set("requireDailyReportDefault", v)} />
                  </div>
                </Section>

                <Section
                  icon={<Plane className="size-4" />}
                  title="การลา"
                  desc="เปิด/ปิดการลาครึ่งวัน และจัดการประเภทการลา"
                  action={
                    <button onClick={() => setAddLeaveOpen(true)} className="flex flex-none items-center gap-1 rounded-[7px] border border-border px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40">
                      <Plus className="size-3.5" /> เพิ่มประเภท
                    </button>
                  }
                >
                  <div className="divide-y divide-hairline-soft">
                    <SwitchRow label="อนุญาตการลาครึ่งวัน (เช้า / บ่าย)" checked={setting.allowHalfDayLeave} onChange={(v) => set("allowHalfDayLeave", v)} />
                  </div>
                  <div className="mt-3 divide-y divide-hairline-soft overflow-hidden rounded-lg border border-border">
                    {leaveTypes.map((lt) => (
                      <div key={lt.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                        <span className="size-2.5 flex-none rounded-[3px]" style={{ background: lt.color }} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{lt.name}</span>
                        <span className="hidden flex-none text-[12px] text-muted-foreground sm:block">{lt.daysLabel}</span>
                        <span
                          className="flex-none rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                          style={lt.autoApprove ? { background: "#dcfce7", color: "#15803d" } : { background: "#fef3c7", color: "#b45309" }}
                        >
                          {lt.autoApprove ? "อัตโนมัติ" : "ขออนุมัติ"}
                        </span>
                        <button onClick={() => setEditingLeave(lt)} className="flex size-7 flex-none items-center justify-center rounded-[7px] text-zinc-500 transition-colors hover:bg-muted" aria-label={`แก้ไขประเภทการลา ${lt.name}`}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => setPendingLeaveDelete(lt)} className="flex size-7 flex-none items-center justify-center rounded-[7px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40" aria-label={`ลบประเภทการลา ${lt.name}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {leaveTypes.length === 0 && <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">ยังไม่มีประเภทการลา</div>}
                  </div>
                </Section>

                <Section
                  icon={<CalendarOff className="size-4" />}
                  title="วันหยุดบริษัท"
                  desc="วันหยุดจะแสดงบนปฏิทิน แยกจากงาน/รายงาน/การลา"
                  action={
                    <button onClick={() => setAddHolidayOpen(true)} className="flex flex-none items-center gap-1 rounded-[7px] border border-border px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40">
                      <Plus className="size-3.5" /> เพิ่มวันหยุด
                    </button>
                  }
                >
                  <div className="max-h-[280px] divide-y divide-hairline-soft overflow-y-auto overflow-x-hidden rounded-lg border border-border">
                    {holidays.map((h) => (
                      <div key={h.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/40">
                          <CalendarOff className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{h.name}</div>
                          <div className="truncate text-[11.5px] text-muted-foreground">
                            {thaiDateShortFromISO(h.date.slice(0, 10))}
                            {h.description ? ` · ${h.description}` : ""}
                          </div>
                        </div>
                        <span className="hidden flex-none rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground sm:block">
                          {HOLIDAY_TYPE_LABEL[h.type] ?? h.type}
                        </span>
                        <button onClick={() => setPendingHolidayDelete(h)} className="flex size-7 flex-none items-center justify-center rounded-[7px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40" aria-label={`ลบวันหยุด ${h.name}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {holidays.length === 0 && <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">ยังไม่มีวันหยุดบริษัท</div>}
                  </div>
                </Section>
              </div>

              {/* Right column: notifications */}
              <div className="flex flex-col gap-4">
                <Section icon={<Bell className="size-4" />} title="การแจ้งเตือนระบบ" desc="การแจ้งเตือนภายในแอป">
                  <div className="divide-y divide-hairline-soft">
                    <SwitchRow label="แจ้งเตือนให้ส่งรายงานประจำวัน" checked={setting.notifyReportReminder} onChange={(v) => set("notifyReportReminder", v)} />
                    <SwitchRow label="แจ้งเตือนการอนุมัติคำขอลา" checked={setting.notifyLeaveApproval} onChange={(v) => set("notifyLeaveApproval", v)} />
                    <SwitchRow label="แจ้งเตือนงานที่ใกล้ครบกำหนด" checked={setting.notifyTaskDue} onChange={(v) => set("notifyTaskDue", v)} />
                  </div>
                </Section>

                <CloudinaryUsageSection />

                {lineStatus && (
                  <Section icon={<MessageCircle className="size-4" />} title="แจ้งเตือน LINE OA" desc="ส่งการ์ดแจ้งเตือนเข้ากลุ่ม LINE ของทีม">
                    <div className="divide-y divide-hairline-soft">
                      <div className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium">สถานะการเชื่อมต่อ</div>
                          <div className="text-[11.5px] text-muted-foreground">
                            {!lineStatus.enabled
                              ? "ยังไม่เปิดใช้งาน (ตั้งค่าที่เซิร์ฟเวอร์)"
                              : lineStatus.groupConnected
                                ? "เชิญบอทเข้ากลุ่มแล้ว — พร้อมส่งแจ้งเตือน"
                                : "เปิดใช้งานแล้ว — เชิญบอท LINE เข้ากลุ่มทีมเพื่อเริ่มรับแจ้งเตือน"}
                          </div>
                        </div>
                        <span
                          className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            lineStatus.enabled && lineStatus.groupConnected
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                              : lineStatus.enabled
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {lineStatus.enabled && lineStatus.groupConnected
                            ? "เชื่อมกลุ่มแล้ว ✓"
                            : lineStatus.enabled
                              ? "รอเชิญบอท"
                              : "ปิดอยู่"}
                        </span>
                      </div>
                      {lineStatus.quota &&
                        (lineStatus.quota.type === "none" ? (
                          <div className="flex items-center justify-between py-2.5 text-[12px]">
                            <span className="text-muted-foreground">ข้อความ LINE เดือนนี้</span>
                            <span className="font-medium">
                              ส่งไป {lineStatus.quota.used.toLocaleString()} · ไม่จำกัด
                            </span>
                          </div>
                        ) : lineStatus.quota.value !== null ? (
                          (() => {
                            const q = lineStatus.quota!;
                            const value = q.value ?? 0;
                            const remaining = q.remaining ?? 0;
                            const low = value > 0 && remaining <= value * 0.15;
                            const empty = remaining <= 0;
                            const color = empty
                              ? "text-red-600"
                              : low
                                ? "text-amber-600"
                                : "text-zinc-700 dark:text-zinc-200";
                            return (
                              <div className="py-2.5">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="text-muted-foreground">ข้อความ LINE เดือนนี้</span>
                                  <span className={`font-semibold ${color}`}>
                                    ใช้ไป {q.used.toLocaleString()} / {value.toLocaleString()} · เหลือ{" "}
                                    {remaining.toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                  <div
                                    className={`h-full rounded-full ${
                                      empty ? "bg-red-500" : low ? "bg-amber-500" : "bg-teal-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, value > 0 ? (q.used / value) * 100 : 0)}%`,
                                    }}
                                  />
                                </div>
                                <div className="mt-1.5 text-[11px] text-muted-foreground">
                                  รีเซ็ตโควตาอีกครั้ง {nextMonthFirstThai()}
                                </div>
                              </div>
                            );
                          })()
                        ) : null)}
                      {lineStatus.enabled && (
                        <div className="flex flex-col gap-2.5 py-2.5">
                          <div className="rounded-lg border border-hairline bg-muted/30 p-3">
                            <SwitchRow
                              label="เปิดแจ้งเตือน LINE ส่วนตัว (DM รายคน)"
                              checked={setting.linePersonalEnabled}
                              onChange={(v) => set("linePersonalEnabled", v)}
                            />
                            <p className="mt-1 text-[11.5px] text-muted-foreground">
                              ถ้าปิด จะไม่ส่ง DM ส่วนตัวถึงผู้ใช้ (งานที่มอบหมาย · ผลลา · คำขอลา · เตือนรายงาน) — ไม่กระทบการแจ้งเข้ากลุ่มด้านล่าง
                            </p>
                          </div>

                          <div className="mt-1 text-[13px] font-semibold text-muted-foreground">
                            แจ้งเข้ากลุ่ม LINE
                          </div>
                          <SwitchRow
                            label="แจ้ง “งานใหม่” เข้ากลุ่ม LINE"
                            checked={setting.lineNotifyNewTask}
                            onChange={(v) => set("lineNotifyNewTask", v)}
                          />
                          <div>
                            <div className="mb-1.5 text-[13px] font-medium">
                              แจ้ง LINE เมื่อย้ายงานไปสถานะ
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {TASK_STATUS_ENUM_OPTIONS.map((o) => {
                                const on = setting.lineNotifyStatuses.includes(o.value);
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() =>
                                      set(
                                        "lineNotifyStatuses",
                                        on
                                          ? setting.lineNotifyStatuses.filter((s) => s !== o.value)
                                          : [...setting.lineNotifyStatuses, o.value]
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                                      on
                                        ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                                        : "border-border text-zinc-500 hover:bg-muted dark:text-zinc-400"
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                              ยิ่งเลือกน้อย ยิ่งประหยัดโควตาข้อความ
                            </p>
                          </div>

                          <div className="border-t border-hairline-soft pt-1">
                            <SwitchRow
                              label="แจ้ง “คำขอลา” (ยื่น/อนุมัติ) เข้ากลุ่ม LINE"
                              checked={setting.lineNotifyLeave}
                              onChange={(v) => set("lineNotifyLeave", v)}
                            />
                          </div>

                          <div className="border-t border-hairline-soft pt-2.5">
                            <div className="mb-1 text-[13px] font-medium">สรุปรายวันเข้ากลุ่ม LINE</div>
                            <p className="mb-2 text-[11.5px] text-muted-foreground">
                              ส่งสรุปให้กลุ่มอัตโนมัติตามเวลาที่กำหนด (เฉพาะวันทำงาน)
                            </p>
                            <div className="flex flex-col gap-2">
                              <TimedSummaryRow
                                icon={<Plane className="size-3.5" />}
                                label="สรุป “วันนี้มีใครลา”"
                                enabled={setting.lineDailyLeaveSummary}
                                onToggle={(v) => set("lineDailyLeaveSummary", v)}
                                time={setting.lineDailyLeaveSummaryTime}
                                onTime={(v) => set("lineDailyLeaveSummaryTime", v)}
                                onTest={() => testSummary("leave")}
                                testing={testingSummary === "leave"}
                              />
                              <TimedSummaryRow
                                icon={<ClipboardList className="size-3.5" />}
                                label="สรุปการส่งรายงานประจำวัน"
                                enabled={setting.lineDailyReportSummary}
                                onToggle={(v) => set("lineDailyReportSummary", v)}
                                time={setting.lineDailyReportSummaryTime}
                                onTime={(v) => set("lineDailyReportSummaryTime", v)}
                                onTest={() => testSummary("report")}
                                testing={testingSummary === "report"}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>
                )}
              </div>
            </div>

            {/* Sticky save bar for org settings (shown only when there are changes) */}
            {dirty && (
              <div className="sticky bottom-0 z-20 mt-4 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                  <span className="text-[12.5px] text-muted-foreground">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setSetting(baseline)} disabled={saving}>ยกเลิก</Button>
                    <Button onClick={saveSettings} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LeaveTypeDialog open={addLeaveOpen} onClose={() => setAddLeaveOpen(false)} onSaved={(lt) => setLeaveTypes((prev) => [...prev, lt].sort((a, b) => a.sortOrder - b.sortOrder))} nextOrder={leaveTypes.length} />
      <LeaveTypeDialog open={editingLeave !== null} editing={editingLeave} onClose={() => setEditingLeave(null)} onSaved={(lt) => setLeaveTypes((prev) => prev.map((x) => (x.id === lt.id ? lt : x)).sort((a, b) => a.sortOrder - b.sortOrder))} nextOrder={leaveTypes.length} />
      <AddHolidayDialog open={addHolidayOpen} onClose={() => setAddHolidayOpen(false)} onCreated={(h) => setHolidays((prev) => [...prev, h].sort((a, b) => a.date.localeCompare(b.date)))} />

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

type CloudinaryUsage = {
  plan: string | null;
  credits: { used: number; limit: number | null; usedPercent: number | null } | null;
  storage: { usedBytes: number; limitBytes: number | null };
  bandwidth: { usedBytes: number; limitBytes: number | null };
  transformations: { used: number; limit: number | null } | null;
  objects: { used: number; limit: number | null } | null;
  lastUpdated: string | null;
};

/** Cloudinary account credit/storage usage (manager/admin). Lives in Settings so
 *  the per-task upload UI stays focused on uploading. */
function CloudinaryUsageSection() {
  const [status, setStatus] = useState<"loading" | "ok" | "unconfigured" | "error">("loading");
  const [usage, setUsage] = useState<CloudinaryUsage | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ usage: CloudinaryUsage }>("/api/uploads/credit-usage")
      .then((r) => {
        if (!active) return;
        setUsage(r.usage);
        setStatus("ok");
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof ApiError && err.status === 503 ? "unconfigured" : "error");
      });
    return () => {
      active = false;
    };
  }, []);

  const credits = usage?.credits;
  const pct = credits
    ? credits.usedPercent ?? (credits.limit ? (credits.used / credits.limit) * 100 : 0)
    : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-teal-500";

  return (
    <Section
      icon={<HardDrive className="size-4" />}
      title="พื้นที่จัดเก็บไฟล์ (Cloudinary)"
      desc="ปริมาณการใช้งานเครดิตและพื้นที่ของบัญชี Cloudinary"
    >
      {status === "loading" && (
        <div className="text-[12.5px] text-muted-foreground">กำลังโหลด…</div>
      )}
      {status === "unconfigured" && (
        <div className="text-[12.5px] text-muted-foreground">
          ยังไม่ได้ตั้งค่า Cloudinary — เพิ่มตัวแปร <code>CLOUDINARY_*</code> ที่ฝั่งเซิร์ฟเวอร์เพื่อเปิดใช้งานการอัปโหลดไฟล์
        </div>
      )}
      {status === "error" && (
        <div className="text-[12.5px] text-red-600 dark:text-red-400">
          โหลดข้อมูลการใช้งานไม่สำเร็จ
        </div>
      )}
      {status === "ok" && usage && (
        <div className="flex flex-col gap-3.5">
          {credits && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span className="font-medium">เครดิตที่ใช้</span>
                <span className="tabular-nums text-muted-foreground">
                  {credits.used.toFixed(2)}
                  {credits.limit != null ? ` / ${credits.limit}` : ""} ({Math.round(pct)}%)
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`เครดิตที่ใช้ ${Math.round(pct)}%`}
              >
                <div
                  className={`h-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <UsageStat
              label="พื้นที่จัดเก็บ"
              value={formatBytes(usage.storage.usedBytes)}
              sub={usage.storage.limitBytes ? `/ ${formatBytes(usage.storage.limitBytes)}` : undefined}
            />
            <UsageStat
              label="แบนด์วิดท์ (เดือนนี้)"
              value={formatBytes(usage.bandwidth.usedBytes)}
              sub={usage.bandwidth.limitBytes ? `/ ${formatBytes(usage.bandwidth.limitBytes)}` : undefined}
            />
            {usage.objects && (
              <UsageStat
                label="จำนวนไฟล์"
                value={usage.objects.used.toLocaleString()}
                sub={usage.objects.limit != null ? `/ ${usage.objects.limit.toLocaleString()}` : undefined}
              />
            )}
            {usage.transformations && (
              <UsageStat
                label="Transformations"
                value={usage.transformations.used.toLocaleString()}
                sub={
                  usage.transformations.limit != null
                    ? `/ ${usage.transformations.limit.toLocaleString()}`
                    : undefined
                }
              />
            )}
          </div>

          {(usage.plan || usage.lastUpdated) && (
            <div className="text-[11px] text-muted-foreground">
              {usage.plan ? `แผน: ${usage.plan}` : ""}
              {usage.plan && usage.lastUpdated ? " · " : ""}
              {usage.lastUpdated ? `อัปเดต ${thaiDateShortFromISO(usage.lastUpdated)}` : ""}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function UsageStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-muted/30 p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold tabular-nums">
        {value}
        {sub && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function Section({ icon, title, desc, action, children }: { icon: React.ReactNode; title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40">{icon}</span>
          <div className="min-w-0">
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

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="min-w-0 text-[13px]">{label}</span>
      <Switch checked={checked} onChange={() => onChange(!checked)} label={label} />
    </div>
  );
}

/** A daily-summary toggle with an inline time picker and a manual "send test" action. */
function TimedSummaryRow({
  icon,
  label,
  enabled,
  onToggle,
  time,
  onTime,
  onTest,
  testing,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  time: string;
  onTime: (v: string) => void;
  onTest?: () => void;
  testing?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-1 transition-colors ${
        enabled ? "border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className={`flex-none ${enabled ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`}>{icon}</span>
          <span className="min-w-0 truncate">{label}</span>
        </span>
        <Switch checked={enabled} onChange={() => onToggle(!enabled)} label={label} />
      </div>
      {/* Time is always visible so the send time is clear even before enabling;
          it's just dimmed/disabled until the summary is turned on. */}
      <div className="flex items-center gap-2 border-t border-hairline-soft py-2">
        <span className={`flex items-center gap-2 transition-opacity ${enabled ? "" : "opacity-50"}`}>
          <Clock className="size-3.5 flex-none text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">ส่งเวลา</span>
          <Input
            type="time"
            value={time}
            onChange={(e) => onTime(e.target.value)}
            disabled={!enabled}
            className="h-8 w-[104px] text-[13px]"
          />
        </span>
        {onTest && (
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="ml-auto flex-none rounded-md border border-border px-2.5 py-1 text-[11.5px] font-medium text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50 disabled:opacity-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
          >
            {testing ? "กำลังส่ง…" : "ส่งทดสอบ"}
          </button>
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
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

function LeaveTypeDialog({ open, onClose, onSaved, nextOrder, editing }: { open: boolean; onClose: () => void; onSaved: (lt: LeaveType) => void; nextOrder: number; editing?: LeaveType | null }) {
  const [name, setName] = useState("");
  const [daysLabel, setDaysLabel] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [autoApprove, setAutoApprove] = useState("false");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset/prefill the form each time the dialog opens (blank for add, current values for edit).
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setName(editing?.name ?? "");
    setDaysLabel(editing?.daysLabel ?? "");
    setColor(editing?.color ?? "#0d9488");
    setAutoApprove(editing?.autoApprove ? "true" : "false");
  }, [open, editing]);

  async function submit() {
    if (!name.trim() || !daysLabel.trim()) {
      setError("กรุณากรอกชื่อและจำนวนวัน");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        daysLabel: daysLabel.trim(),
        color,
        autoApprove: autoApprove === "true",
      };
      if (editing) {
        const { leaveType } = await api.patch<{ leaveType: LeaveType }>(`/api/settings/leave-types/${editing.id}`, body);
        onSaved(leaveType);
        toast("บันทึกประเภทการลาแล้ว");
      } else {
        const { leaveType } = await api.post<{ leaveType: LeaveType }>("/api/settings/leave-types", { ...body, sortOrder: nextOrder });
        onSaved(leaveType);
        toast("เพิ่มประเภทการลาแล้ว");
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "แก้ไขประเภทการลา" : "เพิ่มประเภทการลา"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "กำลังบันทึก…" : editing ? "บันทึก" : "เพิ่มประเภท"}</Button>
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

function AddHolidayDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (h: Holiday) => void }) {
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
