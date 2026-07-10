"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, TriangleAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { setSession, type AuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";

/** Demo account hint shown when arriving via the landing page's demo button. */
const DEMO_EMAIL = "boss@devpulse.io";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read one-shot query/session signals after mount (avoids useSearchParams'
  // Suspense requirement and any SSR hydration mismatch).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" || params.get("email")) {
      setEmail(params.get("email") || DEMO_EMAIL);
      setNotice("บัญชีทดลอง: กรอกรหัสผ่านที่ผู้ดูแลให้ไว้เพื่อเข้าสู่ระบบ");
    }
    if (window.sessionStorage.getItem("devpulse_session_expired")) {
      window.sessionStorage.removeItem("devpulse_session_expired");
      setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await api.post<{ token: string; user: AuthUser }>(
        "/api/auth/login",
        { email, password },
        false
      );
      setSession(token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่"
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-[380px] max-w-full">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[9px] bg-teal-600">
            <Activity className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold tracking-[-0.02em]">DevPulse</span>
        </div>

        <form
          onSubmit={login}
          className="rounded-[14px] border border-zinc-200 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <div className="mb-1 text-[17px] font-semibold">เข้าสู่ระบบ</div>
          <div className="mb-5 text-[13px] text-zinc-500">
            ระบบปฏิบัติการประจำวันของทีมคุณ
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              <TriangleAlert className="size-4 flex-none" />
              {error}
            </div>
          )}

          {notice && !error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12.5px] text-teal-800">
              <Info className="size-4 flex-none" />
              {notice}
            </div>
          )}

          <label className="mb-1.5 block text-[12.5px] font-medium">อีเมล</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-3.5"
          />

          <label className="mb-1.5 block text-[12.5px] font-medium">
            รหัสผ่าน
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-zinc-400">
          เครื่องมือภายในองค์กร · ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
        </div>
      </div>
    </div>
  );
}
