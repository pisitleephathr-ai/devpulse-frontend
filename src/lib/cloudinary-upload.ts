/**
 * Direct-to-Cloudinary upload using XMLHttpRequest (fetch can't report upload
 * progress). The file NEVER passes through our backend — only the signed params
 * do. Supports per-file progress + cancellation via AbortSignal.
 *
 * The signature/apiKey/timestamp come from our backend's signature endpoint and
 * are sent verbatim; we never handle the Cloudinary API secret here.
 */

export type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: "image" | "raw";
  expiresIn: number;
};

export type CloudinaryUploadResult = {
  public_id: string;
  asset_id?: string;
  version?: number;
  resource_type: string;
  format?: string;
  secure_url: string;
  bytes?: number;
  width?: number;
  height?: number;
};

export class CloudinaryUploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.status = status;
  }
}

/**
 * Upload one file to Cloudinary with signed params. Rejects with
 * CloudinaryUploadError (Cloudinary/network failures) or a DOMException
 * AbortError when cancelled — the caller distinguishes these from backend errors.
 */
export function uploadToCloudinary(
  file: File,
  sig: SignatureResponse,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    form.append("public_id", sig.publicId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    const onAbort = () => xhr.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => opts.signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
        } catch {
          reject(new CloudinaryUploadError("ผลลัพธ์จาก Cloudinary ไม่ถูกต้อง"));
        }
      } else {
        // Do NOT surface Cloudinary's raw error body (may contain params).
        reject(
          new CloudinaryUploadError("อัปโหลดไปยัง Cloudinary ไม่สำเร็จ", xhr.status)
        );
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new CloudinaryUploadError("เชื่อมต่อ Cloudinary ไม่สำเร็จ"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.send(form);
  });
}
