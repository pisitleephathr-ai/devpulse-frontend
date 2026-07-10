"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormCard } from "@/components/form-card";
import { ReportForm } from "@/components/forms/report-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";

export default function CreateReportPage() {
  const router = useRouter();
  const { addReport } = useData();

  return (
    <div className="flex justify-center px-7 py-6">
      <div className="w-[640px] max-w-full">
        <Link
          href="/reports"
          className="mb-3.5 flex items-center gap-1.5 text-[12.5px] text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="size-[13px]" />
          กลับไปหน้ารายงาน
        </Link>

        <div className="mb-1 text-[19px] font-bold tracking-[-0.02em]">
          รายงานประจำวัน
        </div>
        <div className="mb-[18px] text-[13px] text-zinc-500">
          ใช้เวลาประมาณ 2 นาที หัวหน้าทีมอ่านรายงานเหล่านี้ทุกเช้า
        </div>

        <FormCard>
          <ReportForm
            mode="create"
            onSubmit={(data) => {
              addReport(data);
              router.push("/reports");
              toast(
                data.status === "ฉบับร่าง"
                  ? "บันทึกฉบับร่างแล้ว"
                  : "ส่งรายงานแล้ว"
              );
            }}
            onCancel={() => router.push("/reports")}
          />
        </FormCard>
      </div>
    </div>
  );
}
