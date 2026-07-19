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
 * multiple files. Theme-aware via semantic tokens. Announces itself to screen
 * readers and shows distinct dragging + focus states.
 */
export function UploadDropzone({ onFiles, disabled, accept, disabledLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
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
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70",
          disabled
            ? "cursor-not-allowed border-border bg-muted/40 opacity-70"
            : dragging
              ? "border-teal-400 bg-teal-500/10"
              : "border-border bg-muted/30 hover:border-teal-400/60 hover:bg-muted/60"
        )}
      >
        <UploadCloud
          className={cn("size-5", dragging ? "text-teal-500" : "text-muted-foreground")}
          aria-hidden
        />
        {disabled ? (
          <span className="text-[12px] text-muted-foreground">
            {disabledLabel || "ไม่สามารถอัปโหลดเพิ่มได้"}
          </span>
        ) : (
          <>
            <span className="text-[12.5px] font-medium text-foreground">
              ลากไฟล์มาวาง หรือคลิกเพื่อเลือก
            </span>
            <span className="text-[11px] text-muted-foreground">
              รูปภาพหรือเอกสาร · วางรูปด้วย Ctrl/⌘+V ได้
            </span>
          </>
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
          e.target.value = "";
        }}
      />
    </div>
  );
}
