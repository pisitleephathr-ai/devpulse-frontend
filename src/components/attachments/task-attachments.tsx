"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Plus, X, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { useCurrentUser } from "@/lib/use-current-user";
import { useData } from "@/lib/store";
import { isManagerOrAdmin } from "@/lib/permissions";
import type { ApiTaskAttachment } from "@/lib/mappers";
import { isImageUrl } from "@/components/forms/task-form";
import { formatBytes } from "@/lib/upload-config";
import { useUploadConfig } from "@/lib/use-upload-config";
import { useTaskAttachments } from "@/lib/use-attachments";
import { useUploadQueue } from "@/lib/use-upload-queue";
import { UploadDropzone } from "./upload-dropzone";
import { UploadQueue } from "./upload-queue";
import { ImageThumbnail } from "./image-thumbnail";
import { ImageLightbox } from "./image-lightbox";
import { DocumentAttachmentItem } from "./document-attachment-item";
import { AttachmentDeleteDialog } from "./attachment-delete-dialog";

type Props = {
  taskId: string;
  initialAttachments?: ApiTaskAttachment[];
  /** Manage mode: show the uploader + delete controls. When false the section is
   *  view-only (thumbnails, lightbox, download) — used in the read-only detail. */
  canManage: boolean;
};

const p2 = (n: number) => String(n).padStart(2, "0");

/** Auto name for a pasted screenshot: screenshot-YYYYMMDD-HHmmss.png */
function screenshotName(ext: string): string {
  const d = new Date();
  return `screenshot-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(
    d.getHours()
  )}${p2(d.getMinutes())}${p2(d.getSeconds())}.${ext}`;
}

type Rendered = { att: ApiTaskAttachment; isImage: boolean; href: string };

/**
 * Task attachment section: a compact header with a count, the saved attachments
 * (image grid + document list), and a click-to-open uploader (dropzone + queue).
 * Theme-aware; legacy URL attachments keep rendering as before.
 */
export function TaskAttachments({ taskId, initialAttachments = [], canManage }: Props) {
  const me = useCurrentUser();
  const { users, setTaskAttachmentCount } = useData();
  const { config } = useUploadConfig();
  const { attachments, usage, refresh } = useTaskAttachments(taskId, initialAttachments);
  const [adding, setAdding] = useState(false);

  // Keep the board card's attachment count in sync with what's actually here
  // (after uploads/deletes), so the paperclip badge never goes stale.
  useEffect(() => {
    setTaskAttachmentCount(taskId, attachments.length);
  }, [attachments.length, taskId, setTaskAttachmentCount]);

  const remaining = usage
    ? { files: usage.remainingFileCount, bytes: usage.remainingBytes }
    : undefined;

  const queue = useUploadQueue({
    taskId,
    config,
    remaining,
    onSaved: () => void refresh(),
  });

  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiTaskAttachment | null>(null);

  const isManager = isManagerOrAdmin(me);
  const uploaderName = (id?: string | null) =>
    id ? users.find((u) => u.id === id)?.name : undefined;

  const canDelete = (att: ApiTaskAttachment): boolean => {
    if (!canManage) return false; // view-only (detail)
    if (isManager) return true;
    if (att.uploadedById && me && att.uploadedById === me.id) return true;
    if ((att.source ?? "URL") === "URL") return true; // legacy link
    return false;
  };

  const full = !!usage && (usage.remainingFileCount <= 0 || usage.remainingBytes <= 0);
  // Keep the uploader visible while files are still in the queue, even if the
  // user collapsed it, so progress/errors never get hidden mid-upload.
  const showUploader = canManage && (adding || queue.items.length > 0);

  // Clipboard paste — scoped to this component's lifetime (only mounts while the
  // task dialog is open), so we never hijack paste globally.
  useEffect(() => {
    if (!canManage) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const images = items.filter((it) => it.kind === "file" && it.type.startsWith("image/"));
      if (images.length === 0) return;
      const files: File[] = [];
      for (const it of images) {
        const blob = it.getAsFile();
        if (!blob) continue;
        const ext = blob.type.split("/")[1] || "png";
        files.push(new File([blob], screenshotName(ext), { type: blob.type }));
      }
      if (files.length) {
        e.preventDefault();
        setAdding(true);
        queue.enqueue(files, (msg) => toast(msg));
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [canManage, queue]);

  const rendered: Rendered[] = useMemo(
    () =>
      attachments.map((att) => {
        const href = att.secureUrl || att.fileUrl;
        const isImage =
          att.kind === "IMAGE" ||
          att.fileType === "image" ||
          ((att.source ?? "URL") === "URL" && isImageUrl(att.fileUrl));
        return { att, isImage, href };
      }),
    [attachments]
  );

  const images = rendered.filter((r) => r.isImage);
  const docs = rendered.filter((r) => !r.isImage);

  async function doDelete(att: ApiTaskAttachment) {
    try {
      await api.del(`/api/tasks/${taskId}/attachments/${att.id}`);
      toast("ลบไฟล์แล้ว");
      void refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ลบไฟล์ไม่สำเร็จ");
    } finally {
      setPendingDelete(null);
    }
  }

  const acceptAttr = [
    ...config.allowed.extensions,
    ...config.allowed.imageMimeTypes,
    ...config.allowed.documentMimeTypes,
  ].join(",");

  const hasAny = rendered.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Header: title + count, and a compact add toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
          <Paperclip className="size-3.5" />
          ไฟล์แนบ
        </div>
        {rendered.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rendered.length}
          </span>
        )}
        <div className="flex-1" />
        {canManage && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[12px] font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={full && !showUploader}
            aria-expanded={showUploader}
          >
            {showUploader ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {showUploader ? "ปิด" : "แนบไฟล์"}
          </button>
        )}
      </div>

      {/* Uploader (revealed on demand / while uploading) */}
      {showUploader && (
        <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-muted/30 p-2.5">
          <UploadDropzone
            onFiles={(files) => queue.enqueue(files, (msg) => toast(msg))}
            disabled={full}
            accept={acceptAttr}
            disabledLabel={
              usage && usage.remainingFileCount <= 0
                ? `แนบไฟล์ครบ ${config.limits.maxFilesPerTask} ไฟล์แล้ว กรุณาลบไฟล์เดิมก่อน`
                : "พื้นที่ของงานเต็มแล้ว กรุณาลบไฟล์เดิมก่อน"
            }
          />
          <span className="px-0.5 text-[11px] text-muted-foreground">
            รูปภาพ ≤ {formatBytes(config.limits.imageMaxBytes)} · เอกสาร ≤{" "}
            {formatBytes(config.limits.documentMaxBytes)} · สูงสุด{" "}
            {config.limits.maxConcurrentUploads} ไฟล์/ครั้ง
          </span>
          <UploadQueue
            items={queue.items}
            onCancel={queue.cancel}
            onRetry={queue.retry}
            onRemove={queue.remove}
          />
        </div>
      )}

      {/* Saved image attachments */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map(({ att, href }) => (
            <div key={att.id} className="group relative">
              <ImageThumbnail
                thumbnailUrl={att.thumbnailUrl}
                secureUrl={href}
                name={att.fileName}
                onOpen={() => setLightbox({ src: href, name: att.fileName })}
              />
              {canDelete(att) && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(att)}
                  aria-label={`ลบ ${att.fileName}`}
                  className="absolute right-1 top-1 rounded-md bg-card/85 p-1 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Saved document / link attachments */}
      {docs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {docs.map(({ att, href }) => (
            <DocumentAttachmentItem
              key={att.id}
              name={att.fileName}
              href={href}
              size={att.fileSize}
              extension={att.extension}
              uploadedAt={att.createdAt}
              uploaderName={uploaderName(att.uploadedById)}
              isLink={(att.source ?? "URL") === "URL" && !att.fileSize}
              canDelete={canDelete(att)}
              onDelete={() => setPendingDelete(att)}
            />
          ))}
        </div>
      )}

      {!hasAny && !showUploader && (
        <div className="text-[12px] text-muted-foreground">ยังไม่มีไฟล์แนบ</div>
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
      <AttachmentDeleteDialog
        open={pendingDelete !== null}
        fileName={pendingDelete?.fileName ?? null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && doDelete(pendingDelete)}
      />
    </div>
  );
}
