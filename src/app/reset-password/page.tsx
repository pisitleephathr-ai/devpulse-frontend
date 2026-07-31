"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, TriangleAlert, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  // undefined = not yet read (pre-mount); "" = missing from the link; else the token.
  const [token, setToken] = useState<string | undefined>(undefined);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read the token from the URL after mount (mirrors the login page's approach
  // — avoids useSearchParams' Suspense requirement / hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.next.length < 8) return setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw.next !== pw.confirm) return setError("รหัสผ่านยืนยันไม่ตรงกัน");
    setLoading(true);
    try {
      await api.post(
        "/api/auth/reset-password",
        { token, newPassword: pw.next, confirmPassword: pw.confirm },
        false
      );
      // Bounce to login with a one-shot flag so it can confirm success.
      router.replace("/login?reset=1");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่"
      );
      setLoading(false);
    }
  }

  // Token missing from the link entirely — nothing to do here.
  const missingToken = token === "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-[380px] max-w-full">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[9px] bg-teal-600">
            <Activity className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold tracking-[-0.02em]">DevPulse</span>
        </div>

        <div className="rounded-[14px] border border-zinc-200 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {missingToken ? (
            <>
              <div className="mb-1 text-[17px] font-semibold">ลิงก์ไม่ถูกต้อง</div>
              <p className="mb-5 text-[13px] leading-relaxed text-zinc-500">
                ลิงก์ตั้งรหัสผ่านไม่สมบูรณ์ กรุณาขอลิงก์ใหม่อีกครั้ง
              </p>
              <Link href="/forgot-password">
                <Button size="lg" className="w-full">
                  ขอลิงก์ใหม่
                </Button>
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[17px] font-semibold">ตั้งรหัสผ่านใหม่</div>
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-700"
                >
                  {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPw ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              <div className="mb-5 text-[13px] text-zinc-500">
                กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                  <div className="flex items-center gap-2">
                    <TriangleAlert className="size-4 flex-none" />
                    {error}
                  </div>
                  {/* Most failures here are an expired/used link — give a direct
                      way to recover instead of a dead end. */}
                  <Link
                    href="/forgot-password"
                    className="mt-1.5 inline-block font-medium underline underline-offset-2"
                  >
                    ขอลิงก์ใหม่
                  </Link>
                </div>
              )}

              <label className="mb-1.5 block text-[12.5px] font-medium">
                รหัสผ่านใหม่
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                autoComplete="new-password"
                autoFocus
                required
                className="mb-1"
              />
              <div className="mb-3.5 text-[11.5px] text-zinc-400">อย่างน้อย 8 ตัวอักษร</div>

              <label className="mb-1.5 block text-[12.5px] font-medium">
                ยืนยันรหัสผ่านใหม่
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
                required
                className="mb-4"
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !token}
              >
                {loading ? "กำลังบันทึก…" : "ตั้งรหัสผ่านใหม่"}
              </Button>
            </form>
          )}
        </div>

        <Link
          href="/login"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="size-3.5" /> กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
