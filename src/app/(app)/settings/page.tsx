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
  ListOrdered,
  ChevronUp,
  ChevronDown,
  Lock,
  RotateCcw,
  GripVertical,
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
import { thaiDateShortFromISO } from "@/lib/thai-datetime";
import { useCurrentUser } from "@/lib/use-current-user";
import { isAdmin } from "@/lib/permissions";
import { resolveMenu, MENU_UPDATED_EVENT, type MenuConfigItem } from "@/lib/menu";

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
  lineNotifyNewTask: boolean;
  lineNotifyStatuses: string[];
};
type LeaveType = { id: string; name: string; daysLabel: string; color: string; autoApprove: boolean; sortOrder: number };
type Holiday = { id: string; name: string; date: string; description: string; type: string; isActive: boolean };
type MenuEdit = { key: string; label: string; defaultLabel: string; href: string; isVisible: boolean; isLocked: boolean };

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
  lineNotifyNewTask: true,
  lineNotifyStatuses: ["TODO", "DONE"],
};
const SETTING_KEYS = Object.keys(DEFAULT_SETTING) as (keyof Setting)[];
const pickSetting = (s: Record<string, unknown>): Setting =>
  Object.fromEntries(SETTING_KEYS.map((k) => [k, s[k]])) as Setting;

export default function SettingsPage() {
  const me = useCurrentUser();
  const admin = isAdmin(me);

  const [setting, setSetting] = useState<Setting>(DEFAULT_SETTING);
  const [baseline, setBaseline] = useState<Setting>(DEFAULT_SETTING);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [menu, setMenu] = useState<MenuEdit[]>([]);
  const [menuBaseline, setMenuBaseline] = useState<string>("[]");
  const [saving, setSaving] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [pendingLeaveDelete, setPendingLeaveDelete] = useState<LeaveType | null>(null);
  const [pendingHolidayDelete, setPendingHolidayDelete] = useState<Holiday | null>(null);
  const [confirmMenuReset, setConfirmMenuReset] = useState(false);
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

  function toMenuEdit(config: MenuConfigItem[]): MenuEdit[] {
    return resolveMenu(config).map((m) => ({
      key: m.key,
      label: m.label,
      defaultLabel: m.defaultLabel,
      href: m.href,
      isVisible: m.isVisible,
      isLocked: m.isLocked,
    }));
  }

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
      api.get<{ menu: MenuConfigItem[] }>("/api/settings/menu").then((r) => {
        const m = toMenuEdit(r.menu);
        setMenu(m);
        setMenuBaseline(JSON.stringify(m));
      }),
    ])
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof Setting>(k: K, v: Setting[K]) => setSetting((s) => ({ ...s, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(setting) !== JSON.stringify(baseline), [setting, baseline]);
  const menuDirty = useMemo(() => JSON.stringify(menu) !== menuBaseline, [menu, menuBaseline]);

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

  /* ---- menu customization ---- */
  function moveMenu(i: number, dir: -1 | 1) {
    setMenu((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  const setMenuLabel = (i: number, v: string) => setMenu((prev) => prev.map((m, k) => (k === i ? { ...m, label: v } : m)));
  const toggleMenuVisible = (i: number) => setMenu((prev) => prev.map((m, k) => (k === i ? { ...m, isVisible: !m.isVisible } : m)));
  const resetMenuLabel = (i: number) => setMenu((prev) => prev.map((m, k) => (k === i ? { ...m, label: m.defaultLabel } : m)));

  async function saveMenu() {
    if (menu.some((m) => !m.label.trim())) {
      toast("ชื่อเมนูห้ามว่าง");
      return;
    }
    setSavingMenu(true);
    try {
      const config = menu.map((m, i) => ({
        key: m.key,
        customLabel: m.label.trim() === m.defaultLabel ? null : m.label.trim(),
        order: i,
        isVisible: m.isLocked ? true : m.isVisible,
      }));
      const r = await api.patch<{ menu: MenuConfigItem[] }>("/api/settings/menu", { menu: config });
      const m = toMenuEdit(r.menu);
      setMenu(m);
      setMenuBaseline(JSON.stringify(m));
      window.dispatchEvent(new Event(MENU_UPDATED_EVENT));
      toast("บันทึกการตั้งค่าเมนูแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "บันทึกเมนูไม่สำเร็จ");
    } finally {
      setSavingMenu(false);
    }
  }
  async function resetMenu() {
    setSavingMenu(true);
    try {
      const r = await api.post<{ menu: MenuConfigItem[] }>("/api/settings/menu/reset", {});
      const m = toMenuEdit(r.menu);
      setMenu(m);
      setMenuBaseline(JSON.stringify(m));
      window.dispatchEvent(new Event(MENU_UPDATED_EVENT));
      toast("รีเซ็ตเมนูเป็นค่าเริ่มต้นแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "รีเซ็ตไม่สำเร็จ");
    } finally {
      setSavingMenu(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-7">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader eyebrow="SETTINGS" title="ตั้งค่าองค์กร" description="กำหนดค่าองค์กร นโยบายการลา วันหยุด และเมนู" />

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

                <Section icon={<Bell className="size-4" />} title="การแจ้งเตือน" desc="เลือกการแจ้งเตือนที่ต้องการเปิดใช้งาน">
                  <div className="divide-y divide-hairline-soft">
                    <SwitchRow label="แจ้งเตือนให้ส่งรายงานประจำวัน" checked={setting.notifyReportReminder} onChange={(v) => set("notifyReportReminder", v)} />
                    <SwitchRow label="แจ้งเตือนการอนุมัติคำขอลา" checked={setting.notifyLeaveApproval} onChange={(v) => set("notifyLeaveApproval", v)} />
                    <SwitchRow label="แจ้งเตือนงานที่ใกล้ครบกำหนด" checked={setting.notifyTaskDue} onChange={(v) => set("notifyTaskDue", v)} />
                    {lineStatus && (
                      <>
                      <div className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium">แจ้งเตือนงานเข้ากลุ่ม LINE</div>
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
                              </div>
                            );
                          })()
                        ) : null)}
                      {lineStatus.enabled && (
                        <div className="flex flex-col gap-2.5 py-2.5">
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
                        </div>
                      )}
                      </>
                    )}
                  </div>
                </Section>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
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

                {/* Menu customization */}
                <Section
                  icon={<ListOrdered className="size-4" />}
                  title="ตั้งค่าเมนู"
                  desc="จัดลำดับและกำหนดชื่อเมนูที่แสดงในแถบด้านข้าง"
                  action={
                    admin ? (
                      <button onClick={() => setConfirmMenuReset(true)} disabled={savingMenu} className="flex flex-none items-center gap-1 rounded-[7px] border border-border px-[11px] py-[5px] text-[12.5px] font-semibold text-zinc-600 transition-colors hover:bg-muted disabled:opacity-50 dark:text-zinc-300">
                        <RotateCcw className="size-3.5" /> รีเซ็ต
                      </button>
                    ) : undefined
                  }
                >
                  {!admin && <div className="mb-2 text-[12px] text-muted-foreground">เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้</div>}
                  <div className="divide-y divide-hairline-soft overflow-hidden rounded-lg border border-border">
                    {menu.map((m, i) => (
                      <div key={m.key} className="flex items-center gap-2 px-2.5 py-2">
                        <div className="flex flex-none flex-col">
                          <button onClick={() => moveMenu(i, -1)} disabled={!admin || i === 0} className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="เลื่อนขึ้น">
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button onClick={() => moveMenu(i, 1)} disabled={!admin || i === menu.length - 1} className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="เลื่อนลง">
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                        <GripVertical className="size-3.5 flex-none text-zinc-300 dark:text-zinc-600" />
                        <div className="min-w-0 flex-1">
                          <input
                            value={m.label}
                            onChange={(e) => setMenuLabel(i, e.target.value)}
                            disabled={!admin}
                            className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium outline-none hover:border-border focus:border-teal-500 focus:bg-card disabled:cursor-default"
                            aria-label={`ชื่อเมนู ${m.defaultLabel}`}
                          />
                          <div className="truncate px-1.5 text-[10.5px] text-muted-foreground">{m.href}</div>
                        </div>
                        {admin && m.label.trim() !== m.defaultLabel && (
                          <button onClick={() => resetMenuLabel(i)} className="flex-none rounded p-1 text-muted-foreground hover:bg-muted" aria-label="คืนชื่อเดิม" title={`คืนเป็น "${m.defaultLabel}"`}>
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                        {m.isLocked ? (
                          <span className="flex size-7 flex-none items-center justify-center text-zinc-400" title="เมนูระบบ ซ่อนไม่ได้">
                            <Lock className="size-3.5" />
                          </span>
                        ) : (
                          <Switch checked={m.isVisible} onChange={() => admin && toggleMenuVisible(i)} disabled={!admin} label={`แสดงเมนู ${m.label}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  {admin && (
                    <div className="mt-3 flex justify-end">
                      <Button type="button" onClick={saveMenu} disabled={savingMenu || !menuDirty}>
                        {savingMenu ? "กำลังบันทึก…" : "บันทึกเมนู"}
                      </Button>
                    </div>
                  )}
                </Section>
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

      <AddLeaveTypeDialog open={addLeaveOpen} onClose={() => setAddLeaveOpen(false)} onCreated={(lt) => setLeaveTypes((prev) => [...prev, lt].sort((a, b) => a.sortOrder - b.sortOrder))} nextOrder={leaveTypes.length} />
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
      <ConfirmDialog
        open={confirmMenuReset}
        onClose={() => setConfirmMenuReset(false)}
        onConfirm={resetMenu}
        title="รีเซ็ตเมนูเป็นค่าเริ่มต้น?"
        message="ชื่อและลำดับเมนูทั้งหมดจะกลับเป็นค่าเริ่มต้น"
        confirmLabel="รีเซ็ต"
      />
    </div>
  );
}

/* ------------------------------- pieces -------------------------------- */

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

function AddLeaveTypeDialog({ open, onClose, onCreated, nextOrder }: { open: boolean; onClose: () => void; onCreated: (lt: LeaveType) => void; nextOrder: number }) {
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
