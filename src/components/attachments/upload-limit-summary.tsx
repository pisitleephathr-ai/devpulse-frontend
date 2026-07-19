"use client";

import { AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, type AttachmentUsage, type UploadConfig } from "@/lib/upload-config";

type Props = {
  usage: AttachmentUsage | null;
  config: UploadConfig;
  className?: string;
};

/**
 * Compact capacity meta: "X / 20 ไฟล์ · used / total" plus a short inline warning
 * (icon + text, no progress bar) only when the task is near or at a limit.
 * Theme-aware via semantic tokens so it reads correctly in light and dark.
 */
export function UploadLimitSummary({ usage, config, className }: Props) {
  const { limits } = config;
  const fileCount = usage?.fileCount ?? 0;
  const totalBytes = usage?.totalBytes ?? 0;
  const remainingBytes = usage?.remainingBytes ?? limits.maxTotalBytesPerTask;
  const remainingFiles = usage?.remainingFileCount ?? limits.maxFilesPerTask;

  const filesFull = fileCount >= limits.maxFilesPerTask;
  const spaceFull = remainingBytes <= 0;
  const near =
    !filesFull &&
    !spaceFull &&
    (totalBytes / limits.maxTotalBytesPerTask >= 0.9 || remainingFiles <= 2);

  const warning = filesFull
    ? `แนบไฟล์ครบ ${limits.maxFilesPerTask} ไฟล์แล้ว กรุณาลบไฟล์เดิมก่อน`
    : spaceFull
      ? "พื้นที่เต็มแล้ว กรุณาลบไฟล์เดิมก่อน"
      : near
        ? `พื้นที่ใกล้เต็ม เหลืออีก ${formatBytes(remainingBytes)}`
        : null;

  return (
    <div className={cn("text-[11.5px] text-muted-foreground", className)}>
      <span className="tabular-nums">
        {fileCount}/{limits.maxFilesPerTask} ไฟล์
      </span>
      <span className="px-1 opacity-50">·</span>
      <span className="tabular-nums">
        {formatBytes(totalBytes)} / {formatBytes(limits.maxTotalBytesPerTask)}
      </span>
      {warning && (
        <span
          className={cn(
            "ml-1.5 inline-flex items-center gap-1",
            filesFull || spaceFull
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        >
          {filesFull || spaceFull ? (
            <Ban className="size-3 flex-none" aria-hidden />
          ) : (
            <AlertTriangle className="size-3 flex-none" aria-hidden />
          )}
          {warning}
        </span>
      )}
    </div>
  );
}
