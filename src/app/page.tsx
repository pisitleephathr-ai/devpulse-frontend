"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  FileText,
  KanbanSquare,
  CalendarClock,
  Bell,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

const FEATURES = [
  { icon: FileText, title: "รายงานประจำวัน", desc: "บันทึกงานที่ทำ แผนถัดไป และอุปสรรคของแต่ละวัน" },
  { icon: KanbanSquare, title: "บอร์ดงาน", desc: "ติดตามงานแบบ Kanban พร้อมลิงก์ ไฟล์แนบ และกำหนดส่ง" },
  { icon: CalendarClock, title: "คำขอลา", desc: "ขอลาและอนุมัติผ่านระบบ พร้อมปฏิทินทีม" },
  { icon: LayoutDashboard, title: "แดชบอร์ดเชิงลึก", desc: "ภาระงานของทีม อุปสรรค และสถานะรายงานในที่เดียว" },
  { icon: Bell, title: "การแจ้งเตือน", desc: "รับแจ้งเมื่อได้รับมอบหมายงานหรือคำขอลาถูกอนุมัติ" },
  { icon: ShieldCheck, title: "สิทธิ์ตามบทบาท", desc: "ควบคุมการเข้าถึงด้วย RBAC และบันทึกกิจกรรมทั้งหมด" },
];

const STACK = ["Next.js", "TypeScript", "Tailwind CSS", "Express", "Prisma", "PostgreSQL", "JWT"];

export default function LandingPage() {
  const router = useRouter();

  // Already signed in → straight to the app.
  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600">
            <Activity className="size-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold tracking-[-0.02em]">DevPulse</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-teal-700"
        >
          เข้าสู่ระบบ
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-12 text-center sm:pt-20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[12px] font-medium text-teal-700">
          <span className="size-1.5 rounded-full bg-teal-500" />
          ระบบปฏิบัติการประจำวันของทีมพัฒนา
        </div>
        <h1 className="mx-auto max-w-3xl text-[34px] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[46px]">
          จัดการทีมพัฒนาซอฟต์แวร์
          <br />
          <span className="text-teal-600">ในที่เดียว</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-600">
          DevPulse คือแดชบอร์ดสำหรับทีมพัฒนา ติดตามรายงานประจำวัน งาน คำขอลา
          อุปสรรค และกิจกรรมของทีมได้ในที่เดียว
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            เข้าสู่ระบบ
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login?demo=1"
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            ทดลองใช้งาน
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <f.icon className="size-[18px]" />
              </div>
              <h3 className="mb-1 text-[14.5px] font-semibold">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Built with
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((s) => (
            <span
              key={s}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12.5px] font-medium text-zinc-600"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-6 text-center text-[12px] text-zinc-400">
        DevPulse · เครื่องมือภายในองค์กรสำหรับทีมพัฒนา
      </footer>
    </div>
  );
}
