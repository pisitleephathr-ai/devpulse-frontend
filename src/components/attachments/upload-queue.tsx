"use client";

import { X, RotateCcw, CheckCircle2, AlertCircle, ImageIcon, FileText } from "lucide-react";
import { formatBytes } from "@/lib/upload-config";
import type { QueueItem, UploadState } from "@/lib/use-upload-queue";

const STATE_LABEL: Record<UploadState, string> = {
  queued: "รอคิว",
  validating: "กำลังตรวจสอบ",
  uploading: "กำลังอัปโหลด",
  saving: "กำลังบันทึก",
  success: "สำเร็จ",
  error: "ผิดพลาด",
  cancelled: "ยกเลิกแล้ว",
};

function isActive(s: UploadState) {
  return s === "queued" || s === "validating" || s === "uploading" || s === "saving";
}

type Props = {
  items: QueueItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Live upload queue — one row per file with its own progress + controls. */
export function UploadQueue({ items, onCancel, onRetry, onRemove }: Props) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5" aria-label="คิวการอัปโหลด">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center gap-2.5 rounded-lg border border-hairline bg-card px-2.5 py-2"
        >
          <div className="flex size-8 flex-none items-center justify-center overflow-hidden rounded bg-muted">
            {it.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : it.kind === "IMAGE" ? (
              <ImageIcon className="size-4 text-muted-foreground" />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[12px] font-medium text-foreground" title={it.name}>
                {it.name}
              </span>
              <span className="flex-none text-[10.5px] text-muted-foreground">
                {formatBytes(it.size)}
              </span>
            </div>

            {isActive(it.state) && (
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={it.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-teal-500 transition-all"
                  style={{
                    width: `${it.state === "uploading" ? it.progress : it.state === "saving" ? 100 : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="mt-0.5 flex items-center gap-1 text-[10.5px]">
              {it.state === "success" && (
                <CheckCircle2 className="size-3 text-emerald-500" aria-hidden />
              )}
              {it.state === "error" && (
                <AlertCircle className="size-3 text-red-500" aria-hidden />
              )}
              <span
                className={
                  it.state === "error"
                    ? "text-red-600 dark:text-red-400"
                    : it.state === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                }
              >
                {it.state === "uploading"
                  ? `${STATE_LABEL.uploading} ${it.progress}%`
                  : it.error || STATE_LABEL[it.state]}
              </span>
            </div>
          </div>

          <div className="flex flex-none items-center gap-0.5">
            {it.state === "error" && (
              <button
                type="button"
                onClick={() => onRetry(it.id)}
                aria-label={`ลองใหม่ ${it.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-teal-600"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
            {isActive(it.state) ? (
              <button
                type="button"
                onClick={() => onCancel(it.id)}
                aria-label={`ยกเลิก ${it.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                aria-label={`นำออก ${it.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
