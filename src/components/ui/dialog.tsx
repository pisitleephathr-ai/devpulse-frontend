"use client";

import { useEffect, useId, useRef } from "react";
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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight controlled modal. Closes on overlay click, Escape, or the X.
 * Locks body scroll while open, moves focus into the panel, traps Tab within it,
 * and restores focus to the trigger on close. No Radix dependency.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusable = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null
          )
        : [];

    // Move focus into the dialog (first focusable, else the panel itself).
    (focusable()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      className="dp-scrim fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "dp-pop flex max-h-[85vh] w-[560px] max-w-full flex-col overflow-hidden rounded-[14px] bg-card shadow-[0_20px_50px_rgba(0,0,0,0.2)] outline-none",
          className
        )}
      >
        <div className="flex items-start gap-3 border-b border-hairline px-[22px] py-[18px]">
          <div className="flex-1">
            <div id={titleId} className="text-[15px] font-semibold">
              {title}
            </div>
            {description && (
              <div id={descId} className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[7px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
