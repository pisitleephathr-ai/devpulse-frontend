"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, TriangleAlert, MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

/** Seconds to wait before a resend is allowed (blunts accidental re-sends / abuse). */
const RESEND_COOLDOWN_S = 30;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email }, false);
      // The API always replies the same way (no account enumeration), so we
      // show the same confirmation regardless of whether the email exists.
      setSent(true);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void send();
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

        <div className="rounded-[14px] border border-border bg-card p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {sent ? (
            <>
              <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/10">
                <MailCheck className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="mb-1 text-[17px] font-semibold">ตรวจสอบอีเมลของคุณ</div>
              <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
                หากอีเมล{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
                ลิงก์จะใช้ได้ภายใน 1 ชั่วโมง — หากไม่พบอีเมล ลองตรวจในกล่องสแปม
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <TriangleAlert className="size-4 flex-none" />
                  {error}
                </div>
              )}

              <Button
                variant="secondary"
                size="lg"
                className="mb-2 w-full"
                onClick={() => void send()}
                disabled={loading || cooldown > 0}
              >
                {loading
                  ? "กำลังส่ง…"
                  : cooldown > 0
                    ? `ส่งอีกครั้งใน ${cooldown} วินาที`
                    : "ยังไม่ได้รับอีเมล? ส่งอีกครั้ง"}
              </Button>
              <Link href="/login">
                <Button size="lg" className="w-full">
                  กลับไปหน้าเข้าสู่ระบบ
                </Button>
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="mb-1 text-[17px] font-semibold">ลืมรหัสผ่าน?</div>
              <div className="mb-5 text-[13px] text-muted-foreground">
                กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <TriangleAlert className="size-4 flex-none" />
                  {error}
                </div>
              )}

              <label className="mb-1.5 block text-[12.5px] font-medium">อีเมล</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="mb-4"
              />

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "กำลังส่ง…" : "ส่งลิงก์ตั้งรหัสผ่าน"}
              </Button>
            </form>
          )}
        </div>

        {!sent && (
          <Link
            href="/login"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> กลับไปหน้าเข้าสู่ระบบ
          </Link>
        )}
      </div>
    </div>
  );
}
