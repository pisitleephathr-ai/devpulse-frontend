"use client";

import { TriangleAlert, RefreshCw } from "lucide-react";
import { useData } from "@/lib/store";

/**
 * App-wide data health banner. When the initial store load fails (network /
 * server error), show a non-blocking bar with a retry button so the user
 * isn't left staring at empty pages with no explanation.
 */
export function DataStatusBanner() {
  const { error, loading, refresh } = useData();
  if (!error) return null;

  return (
    <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-6 py-2">
      <TriangleAlert className="size-4 flex-none text-red-600" />
      <span className="flex-1 text-[12.5px] text-red-800">
        โหลดข้อมูลไม่สำเร็จ — {error}
      </span>
      <button
        onClick={() => refresh()}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        ลองใหม่
      </button>
    </div>
  );
}
