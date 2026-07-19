"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Accept attribute for the hidden input (extensions/mime). */
  accept?: string;
  /** Message shown when disabled (e.g. limit reached). */
  disabledLabel?: string;
};

/**
 * Accessible upload dropzone: click / Enter / Space to browse, drag-and-drop,
 * multiple files. Announces itself to screen readers and shows a distinct
 * dragging + focus state. Rejected-type feedback is handled upstream (enqueue).
 */
export function UploadDropzone({ onFiles, disabled, accept, disabledLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragInvalid, setDragInvalid] = useState(false);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setDragInvalid(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label="อัปโหลดไฟล์แนบ: ลากไฟล์มาวางหรือกดเพื่อเลือกไฟล์"
        onDragOver={(e) => {
          e.preventDefault();
          if (disabled) return;
          setDragging(true);
          // Detect any unsupported item type during drag for early feedback.
          const items = Array.from(e.dataTransfer.items || []);
          setDragInvalid(
            items.length > 0 &&
              items.some((it) => it.kind === "file" && it.type === "")
          );
        }}
        onDragLeave={() => {
          setDragging(false);
          setDragInvalid(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
            : dragging
              ? "border-teal-400 bg-teal-50"
              : "border-zinc-300 hover:border-teal-300 hover:bg-zinc-50"
        )}
      >
        <UploadCloud
          className={cn("size-6", dragging ? "text-teal-500" : "text-zinc-400")}
          aria-hidden
        />
        {disabled ? (
          <span className="text-[12.5px] text-zinc-500">
            {disabledLabel || "ไม่สามารถอัปโหลดเพิ่มได้"}
          </span>
        ) : (
          <>
            <span className="text-[12.5px] font-medium text-zinc-700">
              ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
            </span>
            <span className="text-[11px] text-zinc-400">รองรับรูปภาพและเอกสาร</span>
          </>
        )}
        {dragInvalid && (
          <span className="text-[11px] text-amber-600">
            มีไฟล์บางรายการที่ระบบไม่รองรับ
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          // Reset so selecting the same file again re-fires change.
          e.target.value = "";
        }}
      />
    </div>
  );
}
