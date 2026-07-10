"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/components/ui/toaster";
import { LEAVE_TYPE_SETTINGS } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div className="flex justify-center px-7 py-6">
      <div className="flex w-[640px] max-w-full flex-col gap-4">
        <PageHeader eyebrow="SETTINGS" title="ตั้งค่า" />

        {/* Workspace */}
        <div className="rounded-xl border border-zinc-200 bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-3.5 text-[13.5px] font-semibold">เวิร์กสเปซ</div>

          <label className="mb-1.5 block text-[12.5px] font-medium">
            ชื่อทีม
          </label>
          <Input defaultValue="ทีมแพลตฟอร์ม" className="mb-3.5" />

          <label className="mb-1.5 block text-[12.5px] font-medium">
            เวลาแจ้งเตือนส่งรายงาน
          </label>
          <div className="w-[200px]">
            <Select defaultValue="16:30 น.">
              <option>16:30 น.</option>
              <option>17:00 น.</option>
              <option>17:30 น.</option>
            </Select>
          </div>
        </div>

        {/* Leave types */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-hairline px-[22px] py-4">
            <span className="text-[13.5px] font-semibold">ประเภทการลา</span>
            <button
              onClick={() => toast("หน้าแก้ไขประเภทการลาจะมาเร็วๆ นี้")}
              className="rounded-[7px] border border-zinc-200 px-[11px] py-[5px] text-[12.5px] font-semibold text-teal-600 transition-colors hover:border-teal-200 hover:bg-teal-50"
            >
              เพิ่มประเภท
            </button>
          </div>
          {LEAVE_TYPE_SETTINGS.map((lt) => (
            <div
              key={lt.name}
              className="flex items-center gap-3 border-b border-hairline-soft px-[22px] py-3 last:border-b-0"
            >
              <span
                className="size-2.5 rounded-[3px]"
                style={{ background: lt.color }}
              />
              <span className="flex-1 text-[13px] font-medium">{lt.name}</span>
              <span className="text-[12.5px] text-zinc-500">{lt.days}</span>
              <StatusPill
                label={lt.approval}
                bg={lt.approvalBg}
                fg={lt.approvalFg}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
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
