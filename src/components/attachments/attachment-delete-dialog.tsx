"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = {
  open: boolean;
  fileName: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** Confirmation before deleting an attachment (removes it from Cloudinary too). */
export function AttachmentDeleteDialog({ open, fileName, onClose, onConfirm }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="ลบไฟล์แนบ"
      message={
        fileName
          ? `ต้องการลบไฟล์ "${fileName}" หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`
          : "ต้องการลบไฟล์นี้หรือไม่?"
      }
      confirmLabel="ลบไฟล์"
      cancelLabel="ยกเลิก"
      destructive
    />
  );
}
