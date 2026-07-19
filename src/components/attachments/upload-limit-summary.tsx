"use client";

import { AlertTriangle, CheckCircle2, Info, Ban } from "lucide-react";
import { formatBytes, type AttachmentUsage, type UploadConfig } from "@/lib/upload-config";

type Props = {
  usage: AttachmentUsage | null;
  config: UploadConfig;
};

type Level = "normal" | "warning" | "near" | "full";

function levelFor(percent: number): Level {
  if (percent >= 100) return "full";
  if (percent >= 90) return "near";
  if (percent >= 70) return "warning";
  return "normal";
}

const LEVEL_STYLE: Record<Level, { bar: string; text: string; Icon: typeof Info }> = {
  normal: { bar: "bg-teal-500", text: "text-zinc-500", Icon: Info },
  warning: { bar: "bg-amber-500", text: "text-amber-600", Icon: AlertTriangle },
  near: { bar: "bg-orange-500", text: "text-orange-600", Icon: AlertTriangle },
  full: { bar: "bg-red-500", text: "text-red-600", Icon: Ban },
};

/**
 * Limit summary card: files used/remaining, space used/remaining, an accessible
 * space progress bar (colour + icon + text, never colour alone), and the
 * supported file types. Limits come from the backend config (source of truth).
 */
export function UploadLimitSummary({ usage, config }: Props) {
  const { limits } = config;
  const totalBytes = usage?.totalBytes ?? 0;
  const fileCount = usage?.fileCount ?? 0;
  const percent =
    limits.maxTotalBytesPerTask > 0
      ? Math.min(100, Math.round((totalBytes / limits.maxTotalBytesPerTask) * 100))
      : 0;
  const filesFull = fileCount >= limits.maxFilesPerTask;
  const level = levelFor(filesFull ? 100 : percent);
  const { bar, text, Icon } = LEVEL_STYLE[level];

  const remainingBytes = usage?.remainingBytes ?? limits.maxTotalBytesPerTask;
  const remainingFiles = usage?.remainingFileCount ?? limits.maxFilesPerTask;

  const message =
    level === "full"
      ? filesFull
        ? `แนบไฟล์ครบ ${limits.maxFilesPerTask} ไฟล์แล้ว กรุณาลบไฟล์เดิมก่อน`
        : "พื้นที่เต็มแล้ว กรุณาลบไฟล์เดิมก่อน"
      : level === "near"
        ? `พื้นที่ใกล้เต็ม เหลืออีก ${formatBytes(remainingBytes)}`
        : level === "warning"
          ? `ใช้พื้นที่ไปแล้ว ${percent}%`
          : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex items-center justify-between gap-4 text-[12.5px]">
        <div>
          <div className="text-zinc-400">ไฟล์แนบ</div>
          <div className="font-semibold text-zinc-800">
            {fileCount} / {limits.maxFilesPerTask} ไฟล์
          </div>
        </div>
        <div>
          <div className="text-zinc-400">ใช้พื้นที่</div>
          <div className="font-semibold text-zinc-800">
            {formatBytes(totalBytes)} / {formatBytes(limits.maxTotalBytesPerTask)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-zinc-400">เหลือ</div>
          <div className="font-semibold text-zinc-800">
            {remainingFiles} ไฟล์ · {formatBytes(remainingBytes)}
          </div>
        </div>
      </div>

      {/* Space progress bar */}
      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`ใช้พื้นที่ ${percent}%`}
      >
        <div className={`h-full ${bar} transition-all`} style={{ width: `${percent}%` }} />
      </div>

      {message && (
        <div className={`mt-2 flex items-center gap-1.5 text-[11.5px] ${text}`}>
          <Icon className="size-3.5 flex-none" aria-hidden />
          <span>{message}</span>
        </div>
      )}

      {/* Supported types */}
      <div className="mt-2.5 space-y-0.5 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 flex-none" aria-hidden />
          รูปภาพ: JPG, PNG, WEBP, GIF — สูงสุด {formatBytes(limits.imageMaxBytes)}
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 flex-none" aria-hidden />
          เอกสาร: PDF, DOCX, XLSX, PPTX, TXT, CSV — สูงสุด {formatBytes(limits.documentMaxBytes)}
        </div>
        <div className="pl-4.5">สูงสุด {limits.maxConcurrentUploads} ไฟล์ต่อครั้ง</div>
      </div>
    </div>
  );
}
