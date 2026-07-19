import { api } from "./api";
import {
  uploadToCloudinary,
  type SignatureResponse,
  type CloudinaryUploadResult,
} from "./cloudinary-upload";

/**
 * Upload a single file to a task: signature (backend) → direct Cloudinary upload
 * → complete (backend persist). Shared by the upload queue and the create/edit
 * task form (deferred upload after the task is saved). Throws on failure.
 */
export async function uploadFileToTask(
  taskId: string,
  file: File,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}
): Promise<void> {
  const sig = await api.post<SignatureResponse>(
    `/api/tasks/${taskId}/attachments/signature`,
    { fileName: file.name, mimeType: file.type, fileSize: file.size }
  );

  const result: CloudinaryUploadResult = await uploadToCloudinary(file, sig, opts);

  await api.post(`/api/tasks/${taskId}/attachments/complete`, {
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    publicId: result.public_id,
    assetId: result.asset_id ?? result.public_id,
    version: result.version,
    resourceType: sig.resourceType,
    format: result.format,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
  });
}
