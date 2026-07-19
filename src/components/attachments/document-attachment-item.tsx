"use client";

import {
  FileText,
  FileSpreadsheet,
  Presentation,
  File as FileIcon,
  Download,
  Trash2,
  Link2,
} from "lucide-react";
import { formatBytes, extensionOf } from "@/lib/upload-config";
import { thaiDateShortFromISO } from "@/lib/thai-datetime";

type Props = {
  name: string;
  href: string;
  /** null for legacy URL links. */
  size?: number | null;
  extension?: string | null;
  uploadedAt?: string;
  uploaderName?: string;
  isLink?: boolean;
  canDelete: boolean;
  onDelete: () => void;
};

/** Render the type icon for a file extension (returns JSX, not a component). */
function fileIcon(ext: string, isLink: boolean) {
  const cls = "size-5 flex-none text-muted-foreground";
  if (isLink) return <Link2 className={cls} aria-hidden />;
  if ([".xls", ".xlsx", ".csv"].includes(ext))
    return <FileSpreadsheet className={cls} aria-hidden />;
  if ([".ppt", ".pptx"].includes(ext))
    return <Presentation className={cls} aria-hidden />;
  if ([".pdf", ".doc", ".docx", ".txt"].includes(ext))
    return <FileText className={cls} aria-hidden />;
  return <FileIcon className={cls} aria-hidden />;
}

/**
 * A document / non-image attachment row: type icon, name (ellipsis + full-name
 * tooltip), size, upload date, uploader, download, and a permission-gated delete.
 */
export function DocumentAttachmentItem({
  name,
  href,
  size,
  extension,
  uploadedAt,
  uploaderName,
  isLink,
  canDelete,
  onDelete,
}: Props) {
  const ext = (extension || extensionOf(name) || "").toLowerCase();

  const meta = [
    size ? formatBytes(size) : null,
    uploadedAt ? `อัปโหลด ${thaiDateShortFromISO(uploadedAt)}` : null,
    uploaderName ? `โดย ${uploaderName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-card px-3 py-2">
      {fileIcon(ext, !!isLink)}
      <div className="min-w-0 flex-1">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={name}
          className="block truncate text-[12.5px] font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          {name}
        </a>
        {meta && <div className="truncate text-[11px] text-muted-foreground">{meta}</div>}
      </div>
      <a
        href={href}
        download={name}
        target="_blank"
        rel="noreferrer"
        aria-label={`ดาวน์โหลด ${name}`}
        className="flex-none rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Download className="size-4" />
      </a>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`ลบ ${name}`}
          className="flex-none rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
