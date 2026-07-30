"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** May be async — the dialog stays open with a busy state until it resolves.
   *  Returns unknown so callers can use `cond && doAsync()` shorthand. */
  onConfirm: () => unknown;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/** Confirmation modal with an in-flight state so it doesn't close before the
 *  (possibly async) action finishes. Stays open if the action throws so the
 *  user sees the resulting error toast. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  destructive = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Leave the dialog open; the action's own error toast explains what failed.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      className="w-[440px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "กำลังดำเนินการ…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-zinc-600">{message}</p>
    </Dialog>
  );
}
