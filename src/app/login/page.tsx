"use client";

import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  function login(e: React.FormEvent) {
    e.preventDefault();
    // No auth logic yet — go straight to the dashboard.
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-[380px] max-w-full">
        {/* Brand */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[9px] bg-teal-600">
            <Activity className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold tracking-[-0.02em]">DevPulse</span>
        </div>

        {/* Card */}
        <form
          onSubmit={login}
          className="rounded-[14px] border border-zinc-200 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <div className="mb-1 text-[17px] font-semibold">เข้าสู่ระบบ</div>
          <div className="mb-5 text-[13px] text-zinc-500">
            ระบบปฏิบัติการประจำวันของทีมคุณ
          </div>

          <label className="mb-1.5 block text-[12.5px] font-medium">
            อีเมล
          </label>
          <Input
            type="email"
            defaultValue="lena@devpulse.io"
            className="mb-3.5"
          />

          <label className="mb-1.5 block text-[12.5px] font-medium">
            รหัสผ่าน
          </label>
          <Input
            type="password"
            defaultValue="password123"
            className="mb-3.5"
          />

          <label className="mb-[18px] flex cursor-pointer items-center gap-2 text-[13px] text-zinc-700">
            <input
              type="checkbox"
              defaultChecked
              className="size-[15px] accent-teal-600"
            />
            จดจำฉันไว้ในระบบ
          </label>

          <Button type="submit" size="lg" className="w-full">
            เข้าสู่ระบบ
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-zinc-400">
          เครื่องมือภายในองค์กร · ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
        </div>
      </div>
    </div>
  );
}
