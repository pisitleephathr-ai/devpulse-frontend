"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";

type Setting = { teamName: string; reportReminderTime: string };
type LeaveType = {
  id: string;
  name: string;
  daysLabel: string;
  color: string;
  autoApprove: boolean;
  sortOrder: number;
};

const REMINDER_OPTIONS = ["16:30 น.", "17:00 น.", "17:30 น."];

function approvalStyle(autoApprove: boolean) {
  return autoApprove
    ? { label: "อนุมัติอัตโนมัติ", bg: "#dcfce7", fg: "#15803d" }
    : { label: "ต้องขออนุมัติ", bg: "#fef3c7", fg: "#b45309" };
}

export default function SettingsPage() {
  const [setting, setSetting] = useState<Setting>({
    teamName: "",
    reportReminderTime: REMINDER_OPTIONS[0],
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ setting: Setting }>("/api/settings")
      .then((r) => setSetting(r.setting))
      .catch(() => {})
      .finally(() => setLoaded(true));
    api
      .get<{ leaveTypes: LeaveType[] }>("/api/settings/leave-types")
      .then((r) => setLeaveTypes(r.leaveTypes))
      .catch(() => {});
  }, []);

  async function saveWorkspace() {
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

  return (
    <div className="flex justify-center px-7 py-6">
      <div className="flex w-[640px] max-w-full flex-col gap-4">
        <PageHeader eyebrow="SETTINGS" title="ตั้งค่า" />

        {!loaded ? (
          <FormSkeleton sections={2} />
        ) : (
        <>
        {/* Workspace */}
        <div className="rounded-xl border border-zinc-200 bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-3.5 text-[13.5px] font-semibold">เวิร์กสเปซ</div>

          <label className="mb-1.5 block text-[12.5px] font-medium">
            ชื่อทีม
          </label>
          <Input
            value={setting.teamName}
            onChange={(e) =>
              setSetting((s) => ({ ...s, teamName: e.target.value }))
            }
            className="mb-3.5"
          />

          <label className="mb-1.5 block text-[12.5px] font-medium">
            เวลาแจ้งเตือนส่งรายงาน
          </label>
          <div className="w-[200px]">
            <Select
              value={setting.reportReminderTime}
              onChange={(e) =>
                setSetting((s) => ({ ...s, reportReminderTime: e.target.value }))
              }
            >
              {(REMINDER_OPTIONS.includes(setting.reportReminderTime)
                ? REMINDER_OPTIONS
                : [setting.reportReminderTime, ...REMINDER_OPTIONS]
              ).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={saveWorkspace} disabled={saving}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </div>
        </div>

        {/* Leave types */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-hairline px-[22px] py-4">
            <span className="text-[13.5px] font-semibold">ประเภทการลา</span>
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-[7px] border border-zinc-200 px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50"
            >
              เพิ่มประเภท
            </button>
          </div>
          {leaveTypes.map((lt) => {
            const ap = approvalStyle(lt.autoApprove);
            return (
              <div
                key={lt.id}
                className="flex items-center gap-3 border-b border-hairline-soft px-[22px] py-3 last:border-b-0"
              >
                <span
                  className="size-2.5 rounded-[3px]"
                  style={{ background: lt.color }}
                />
                <span className="flex-1 text-[13px] font-medium">{lt.name}</span>
                <span className="text-[12.5px] text-zinc-500">
                  {lt.daysLabel}
                </span>
                <StatusPill label={ap.label} bg={ap.bg} fg={ap.fg} />
              </div>
            );
          })}
          {leaveTypes.length === 0 && (
            <div className="px-[22px] py-6 text-center text-[12.5px] text-zinc-400">
              ยังไม่มีประเภทการลา
            </div>
          )}
        </div>
        </>
        )}
      </div>

      <AddLeaveTypeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(lt) =>
          setLeaveTypes((prev) =>
            [...prev, lt].sort((a, b) => a.sortOrder - b.sortOrder)
          )
        }
        nextOrder={leaveTypes.length}
      />
    </div>
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
      const { leaveType } = await api.post<{ leaveType: LeaveType }>(
        "/api/settings/leave-types",
        {
          name: name.trim(),
          daysLabel: daysLabel.trim(),
          color,
          autoApprove: autoApprove === "true",
          sortOrder: nextOrder,
        }
      );
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
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "กำลังเพิ่ม…" : "เพิ่มประเภท"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <Field label="ชื่อประเภท">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ลาไปอบรม"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="จำนวนวัน">
            <Input
              value={daysLabel}
              onChange={(e) => setDaysLabel(e.target.value)}
              placeholder="เช่น 5 วัน / ปี"
            />
          </Field>
          <Field label="การอนุมัติ">
            <Select
              value={autoApprove}
              onChange={(e) => setAutoApprove(e.target.value)}
            >
              <option value="false">ต้องขออนุมัติ</option>
              <option value="true">อนุมัติอัตโนมัติ</option>
            </Select>
          </Field>
        </div>
        <Field label="สี">
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-32 font-mono"
            />
          </div>
        </Field>
      </div>
    </Dialog>
  );
}

function StatusPill({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      className="rounded-full px-[9px] py-0.5 text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}
