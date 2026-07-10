"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormCard } from "@/components/form-card";
import { LeaveForm } from "@/components/forms/leave-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";

export default function CreateLeavePage() {
  const router = useRouter();
  const { addLeave } = useData();

  return (
    <div className="flex justify-center px-7 py-6">
      <div className="w-[560px] max-w-full">
        <Link
          href="/leaves"
          className="mb-3.5 flex items-center gap-1.5 text-[12.5px] text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="size-[13px]" />
          กลับไปหน้าคำขอลา
        </Link>

        <div className="mb-1 text-[19px] font-bold tracking-[-0.02em]">ขอลา</div>
        <div className="mb-[18px] text-[13px] text-zinc-500">
          คุณเหลือวันลาพักร้อน 14 วันในปีนี้
        </div>

        <FormCard>
          <LeaveForm
            onSubmit={(data) => {
              addLeave(data);
              router.push("/leaves");
              toast("ส่งคำขอลาแล้ว — รอการอนุมัติ");
            }}
            onCancel={() => router.push("/leaves")}
          />
        </FormCard>
      </div>
    </div>
  );
}
