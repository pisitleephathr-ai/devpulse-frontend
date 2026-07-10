"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Right-aligned footer actions. */
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Lightweight controlled modal. Closes on overlay click, Escape, or the X.
 * Locks body scroll while open. No Radix dependency — one reusable component.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[85vh] w-[560px] max-w-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]",
          className
        )}
      >
        <div className="flex items-start gap-3 border-b border-hairline px-[22px] py-[18px]">
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{title}</div>
            {description && (
              <div className="mt-0.5 text-xs text-zinc-500">{description}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[7px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-hairline px-[22px] py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
