"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { useCurrentUser } from "@/lib/use-current-user";
import { useData } from "@/lib/store";
import { isManagerOrAdmin } from "@/lib/permissions";
import type { ApiTaskAttachment } from "@/lib/mappers";
import { isImageUrl } from "@/components/forms/task-form";
import { useUploadConfig } from "@/lib/use-upload-config";
import { useTaskAttachments } from "@/lib/use-attachments";
import { useUploadQueue } from "@/lib/use-upload-queue";
import { UploadLimitSummary } from "./upload-limit-summary";
import { UploadDropzone } from "./upload-dropzone";
import { UploadQueue } from "./upload-queue";
import { ImageThumbnail } from "./image-thumbnail";
import { ImageLightbox } from "./image-lightbox";
import { DocumentAttachmentItem } from "./document-attachment-item";
import { AttachmentDeleteDialog } from "./attachment-delete-dialog";

type Props = {
  taskId: string;
  initialAttachments?: ApiTaskAttachment[];
  /** Whether the current user may upload here (assignee / manager / permission). */
  canUpload: boolean;
};

/** Two-digit pad. */
const p2 = (n: number) => String(n).padStart(2, "0");

/** Auto name for a pasted screenshot: screenshot-YYYYMMDD-HHmmss.png */
function screenshotName(ext: string): string {
  const d = new Date();
  return `screenshot-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(
    d.getHours()
  )}${p2(d.getMinutes())}${p2(d.getSeconds())}.${ext}`;
}

type Rendered = {
  att: ApiTaskAttachment;
  isImage: boolean;
  href: string;
};

/**
 * Full attachment section for a task: limit summary, dropzone (drag/click/paste),
 * live upload queue, and the saved attachments (image grid + document list).
 * Legacy URL attachments keep rendering exactly as before.
 */
export function TaskAttachments({ taskId, initialAttachments = [], canUpload }: Props) {
  const me = useCurrentUser();
  const { users } = useData();
  const { config } = useUploadConfig();
  const { attachments, usage, refresh } = useTaskAttachments(taskId, initialAttachments);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const canManage = isManagerOrAdmin(me);
  const uploaderName = (id?: string | null) =>
    id ? users.find((u) => u.id === id)?.name : undefined;

  /** May the current user delete this attachment (UX gate; server re-checks). */
  const canDelete = (att: ApiTaskAttachment): boolean => {
    if (canManage) return true;
    if (att.uploadedById && me && att.uploadedById === me.id) return true;
    // Legacy URL attachments: an uploader may delete if they can edit the task.
    if ((att.source ?? "URL") === "URL" && canUpload) return true;
    return false;
  };

  const full =
    !!usage &&
    (usage.remainingFileCount <= 0 || usage.remainingBytes <= 0);

  // Clipboard paste — scoped to this component's lifetime (it only mounts while
  // the task dialog is open), so we never hijack paste globally across the app.
  useEffect(() => {
    if (!canUpload) return;
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
        queue.enqueue(files, (msg) => toast(msg));
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [canUpload, queue]);

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

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-900">
        <Paperclip className="size-3.5" />
        ไฟล์แนบ
      </div>

      {canUpload && <UploadLimitSummary usage={usage} config={config} />}

      {canUpload && (
        <>
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
          <UploadQueue
            items={queue.items}
            onCancel={queue.cancel}
            onRetry={queue.retry}
            onRemove={queue.remove}
          />
        </>
      )}

      {/* Saved image attachments */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map(({ att, href }) => (
            <div key={att.id} className="relative">
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
                  className="absolute right-1 top-1 rounded-md bg-white/85 p-1 text-zinc-500 shadow-sm hover:bg-white hover:text-red-600"
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 001 1h8a1 1 0 001-1V6" />
                  </svg>
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

      {rendered.length === 0 && !canUpload && (
        <div className="text-[12px] text-zinc-400">ไม่มีไฟล์แนบ</div>
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
