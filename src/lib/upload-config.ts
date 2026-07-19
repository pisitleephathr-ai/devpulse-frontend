/**
 * Client-side types + fallback for the task-attachment upload limits.
 *
 * The backend (GET /api/uploads/config) is the SOURCE OF TRUTH. These fallback
 * values are used ONLY when that request hasn't resolved / failed, so the UI can
 * still render sensible limits. Every rule is re-enforced server-side.
 */

export type UploadLimits = {
  imageMaxBytes: number;
  documentMaxBytes: number;
  maxFilesPerTask: number;
  maxTotalBytesPerTask: number;
  maxConcurrentUploads: number;
};

export type UploadAllowed = {
  imageMimeTypes: string[];
  documentMimeTypes: string[];
  extensions: string[];
};

export type UploadConfig = {
  limits: UploadLimits;
  allowed: UploadAllowed;
};

export type AttachmentUsage = {
  fileCount: number;
  totalBytes: number;
  remainingFileCount: number;
  remainingBytes: number;
};

/** Fallback mirror of the backend defaults (used only until config loads). */
export const FALLBACK_CONFIG: UploadConfig = {
  limits: {
    imageMaxBytes: 5 * 1024 * 1024,
    documentMaxBytes: 10 * 1024 * 1024,
    maxFilesPerTask: 20,
    maxTotalBytesPerTask: 100 * 1024 * 1024,
    maxConcurrentUploads: 5,
  },
  allowed: {
    imageMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    documentMimeTypes: [
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.ms-powerpoint",
    ],
    extensions: [
      ".jpg", ".jpeg", ".png", ".webp", ".gif",
      ".pdf", ".txt", ".csv", ".doc", ".docx",
      ".xls", ".xlsx", ".ppt", ".pptx",
    ],
  },
};

export type AttachmentKindValue = "IMAGE" | "DOCUMENT";

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot).toLowerCase();
}

export function kindForMime(
  mime: string,
  allowed: UploadAllowed
): AttachmentKindValue | null {
  if (allowed.imageMimeTypes.includes(mime)) return "IMAGE";
  if (allowed.documentMimeTypes.includes(mime)) return "DOCUMENT";
  return null;
}

export function maxBytesForKind(kind: AttachmentKindValue, limits: UploadLimits): number {
  return kind === "IMAGE" ? limits.imageMaxBytes : limits.documentMaxBytes;
}

/** Human-friendly size, e.g. 1536000 -> "1.5 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * Insert a Cloudinary transformation into a delivery URL (after `/upload/`), so
 * we can request a sized/optimized variant without loading the original. Returns
 * the URL unchanged if it isn't a recognizable Cloudinary upload URL.
 */
export function withCloudinaryTransform(secureUrl: string, transform: string): string {
  const marker = "/upload/";
  const i = secureUrl.indexOf(marker);
  if (i === -1) return secureUrl;
  const head = secureUrl.slice(0, i + marker.length);
  const tail = secureUrl.slice(i + marker.length);
  return `${head}${transform}/${tail}`;
}

/** ~1600px, quality/format-auto variant for the lightbox (not the original). */
export function previewUrlOf(secureUrl: string): string {
  return withCloudinaryTransform(secureUrl, "c_limit,w_1600,q_auto,f_auto");
}

/** ~320x180 fill thumbnail (fallback when the server didn't store one). */
export function thumbUrlOf(secureUrl: string): string {
  return withCloudinaryTransform(secureUrl, "c_fill,w_320,h_180,q_auto,f_auto");
}

export type ClientValidation =
  | { ok: true; kind: AttachmentKindValue; extension: string }
  | { ok: false; error: string };

/**
 * Client-side pre-flight validation mirroring the backend rules. UX only — the
 * server re-validates everything. Returns the resolved kind or a Thai message.
 */
export function validateFile(file: File, config: UploadConfig): ClientValidation {
  const name = file.name.trim();
  if (!name) return { ok: false, error: "ชื่อไฟล์ว่างไม่ได้" };

  const kind = kindForMime(file.type, config.allowed);
  if (!kind) {
    return { ok: false, error: `ไม่รองรับไฟล์ประเภท ${file.type || "ไม่ทราบ"}` };
  }

  const ext = extensionOf(name);
  if (!ext || !config.allowed.extensions.includes(ext)) {
    return { ok: false, error: `ไม่รองรับไฟล์ประเภท ${ext || "(ไม่มีนามสกุล)"}` };
  }

  const max = maxBytesForKind(kind, config.limits);
  if (file.size <= 0) return { ok: false, error: "ไฟล์ว่างเปล่า" };
  if (file.size > max) {
    return {
      ok: false,
      error: `ไฟล์ ${name} มีขนาด ${formatBytes(file.size)} เกินขนาดสูงสุดสำหรับ${
        kind === "IMAGE" ? "รูปภาพ" : "เอกสาร"
      } ${formatBytes(max)}`,
    };
  }
  return { ok: true, kind, extension: ext };
}
