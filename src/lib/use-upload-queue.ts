"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import {
  uploadToCloudinary,
  CloudinaryUploadError,
  type SignatureResponse,
  type CloudinaryUploadResult,
} from "./cloudinary-upload";
import {
  validateFile,
  type UploadConfig,
  type AttachmentKindValue,
} from "./upload-config";

export type UploadState =
  | "queued"
  | "validating"
  | "uploading"
  | "saving"
  | "success"
  | "error"
  | "cancelled";

export type QueueItem = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKindValue;
  /** Local object URL for image preview (revoked on removal). */
  previewUrl?: string;
  state: UploadState;
  progress: number;
  error?: string;
};

/** A finished item is done for good — no scheduler work remains. */
function isTerminal(s: UploadState) {
  return s === "success" || s === "error" || s === "cancelled";
}

type Options = {
  taskId: string;
  config: UploadConfig;
  /** Called after each successful save so the list + usage can refresh. */
  onSaved?: () => void;
  /** Extra capacity guard from live usage (remaining count / bytes). */
  remaining?: { files: number; bytes: number };
};

/**
 * Upload queue: validates files, then runs signature → Cloudinary → complete for
 * each independently with a concurrency cap. One file failing never aborts the
 * others (no Promise.all). Supports per-file cancel + retry.
 */
export function useUploadQueue({ taskId, config, onSaved, remaining }: Options) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const itemsRef = useRef<QueueItem[]>([]);
  const filesRef = useRef<Map<string, File>>(new Map());
  const abortsRef = useRef<Map<string, AbortController>>(new Map());
  const activeRef = useRef(0);
  const seqRef = useRef(0);

  const concurrency = Math.max(1, Math.min(config.limits.maxConcurrentUploads, 5));

  const sync = useCallback((next: QueueItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<QueueItem>) => {
      sync(itemsRef.current.map((it) => (it.id === id ? { ...it, ...changes } : it)));
    },
    [sync]
  );

  /** Run one file's full pipeline. Never throws — records state on the item. */
  const runItem = useCallback(
    async (id: string) => {
      const file = filesRef.current.get(id);
      if (!file) return;
      const controller = new AbortController();
      abortsRef.current.set(id, controller);

      try {
        patch(id, { state: "uploading", progress: 0, error: undefined });

        // 1) Signed params from our backend (never auto-retried).
        const sig = await api.post<SignatureResponse>(
          `/api/tasks/${taskId}/attachments/signature`,
          { fileName: file.name, mimeType: file.type, fileSize: file.size }
        );

        // 2) Direct upload to Cloudinary with progress + cancellation.
        const result: CloudinaryUploadResult = await uploadToCloudinary(file, sig, {
          signal: controller.signal,
          onProgress: (p) => patch(id, { progress: p }),
        });

        // 3) Confirm + persist on our backend.
        patch(id, { state: "saving", progress: 100 });
        await api.post(`/api/tasks/${taskId}/attachments/complete`, {
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          publicId: result.public_id,
          assetId: result.asset_id ?? result.public_id,
          version: result.version,
          resourceType: (sig.resourceType as "image" | "raw"),
          format: result.format,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
        });

        patch(id, { state: "success", progress: 100 });
        onSaved?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          patch(id, { state: "cancelled" });
        } else if (err instanceof CloudinaryUploadError) {
          patch(id, { state: "error", error: err.message });
        } else if (err instanceof ApiError) {
          patch(id, { state: "error", error: err.message });
        } else {
          patch(id, { state: "error", error: "อัปโหลดไม่สำเร็จ" });
        }
      } finally {
        abortsRef.current.delete(id);
        activeRef.current -= 1;
        pump();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskId, onSaved, patch]
  );

  /** Fill free concurrency slots with queued items. */
  const pump = useCallback(() => {
    while (activeRef.current < concurrency) {
      const next = itemsRef.current.find((it) => it.state === "queued");
      if (!next) break;
      activeRef.current += 1;
      patch(next.id, { state: "validating" });
      void runItem(next.id);
    }
  }, [concurrency, patch, runItem]);

  /**
   * Add files to the queue. Client-side validation + capacity checks (UX only);
   * rejected files are reported via onReject. De-dupes against files already in
   * the queue (same name+size) within this batch and across pending items.
   */
  const enqueue = useCallback(
    (files: File[], onReject?: (msg: string) => void) => {
      const pending = itemsRef.current.filter((it) => !isTerminal(it.state));
      let remainingFiles = remaining
        ? remaining.files - pending.length
        : Number.POSITIVE_INFINITY;
      let remainingBytes = remaining
        ? remaining.bytes - pending.reduce((s, it) => s + it.size, 0)
        : Number.POSITIVE_INFINITY;

      const seenKeys = new Set(pending.map((it) => `${it.name}:${it.size}`));
      const additions: QueueItem[] = [];
      const newFiles = new Map<string, File>();

      for (const file of files) {
        const key = `${file.name}:${file.size}`;
        if (seenKeys.has(key)) {
          onReject?.(`ไฟล์ ${file.name} ถูกเลือกไว้แล้ว`);
          continue;
        }
        const v = validateFile(file, config);
        if (!v.ok) {
          onReject?.(v.error);
          continue;
        }
        if (remainingFiles <= 0) {
          onReject?.("แนบไฟล์ครบจำนวนสูงสุดแล้ว กรุณาลบไฟล์เดิมก่อน");
          continue;
        }
        if (file.size > remainingBytes) {
          onReject?.(`พื้นที่ของงานเหลือไม่พอสำหรับไฟล์ ${file.name}`);
          continue;
        }

        const id = `up_${seqRef.current++}`;
        seenKeys.add(key);
        remainingFiles -= 1;
        remainingBytes -= file.size;
        newFiles.set(id, file);
        additions.push({
          id,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          kind: v.kind,
          previewUrl: v.kind === "IMAGE" ? URL.createObjectURL(file) : undefined,
          state: "queued",
          progress: 0,
        });
      }

      if (additions.length) {
        for (const [id, f] of newFiles) filesRef.current.set(id, f);
        sync([...itemsRef.current, ...additions]);
        pump();
      }
    },
    [config, pump, remaining, sync]
  );

  const cancel = useCallback(
    (id: string) => {
      const ctrl = abortsRef.current.get(id);
      if (ctrl) {
        ctrl.abort(); // in-flight → onabort marks cancelled
      } else {
        patch(id, { state: "cancelled" });
      }
    },
    [patch]
  );

  const retry = useCallback(
    (id: string) => {
      const it = itemsRef.current.find((x) => x.id === id);
      if (!it || it.state !== "error") return;
      patch(id, { state: "queued", progress: 0, error: undefined });
      pump();
    },
    [patch, pump]
  );

  const remove = useCallback(
    (id: string) => {
      const it = itemsRef.current.find((x) => x.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      filesRef.current.delete(id);
      sync(itemsRef.current.filter((x) => x.id !== id));
    },
    [sync]
  );

  const clearFinished = useCallback(() => {
    for (const it of itemsRef.current) {
      if (isTerminal(it.state) && it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    }
    sync(itemsRef.current.filter((it) => !isTerminal(it.state)));
  }, [sync]);

  // Clean up any in-flight uploads + object URLs on unmount.
  useEffect(() => {
    const aborts = abortsRef.current;
    const filesMap = filesRef.current;
    return () => {
      for (const ctrl of aborts.values()) ctrl.abort();
      for (const it of itemsRef.current) {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      }
      aborts.clear();
      filesMap.clear();
    };
  }, []);

  const activeCount = items.filter((it) => !isTerminal(it.state)).length;

  return { items, enqueue, cancel, retry, remove, clearFinished, activeCount };
}
