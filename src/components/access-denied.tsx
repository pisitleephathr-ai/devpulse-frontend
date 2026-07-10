import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** 403 page shown when a user hits a route their role can't access. */
export function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="size-7" />
      </div>
      <div className="text-[18px] font-bold text-zinc-900">
        ไม่มีสิทธิ์เข้าถึง (403)
      </div>
      <p className="mt-1.5 max-w-sm text-[13px] text-zinc-500">
        บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากคิดว่าเป็นข้อผิดพลาด
      </p>
      <Link href="/dashboard" className={`${buttonVariants()} mt-5`}>
        กลับสู่แดชบอร์ด
      </Link>
    </div>
  );
}
