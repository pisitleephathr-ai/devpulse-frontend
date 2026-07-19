"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, ExternalLink, Download } from "lucide-react";
import { previewUrlOf } from "@/lib/upload-config";

type Props = {
  onClose: () => void;
  /** Original Cloudinary secure URL. */
  src: string;
  name: string;
};

/**
 * Full-screen image viewer. Loads a sized preview variant (not the original),
 * supports zoom toggle, open-in-new-tab, and download. Closes on Escape / overlay
 * click. Mounted conditionally by the parent, so it always opens fresh (zoom
 * reset) without touching state inside an effect.
 */
export function ImageLightbox({ onClose, src, name }: Props) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const preview = previewUrlOf(src);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`ดูรูป ${name}`}
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 p-3 text-white">
        <span className="truncate text-sm" title={name}>
          {name}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? "ย่อ" : "ขยาย"}
            className="rounded-md p-2 hover:bg-white/15"
          >
            {zoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="เปิดในแท็บใหม่"
            className="rounded-md p-2 hover:bg-white/15"
          >
            <ExternalLink className="size-4" />
          </a>
          <a
            href={src}
            download={name}
            aria-label="ดาวน์โหลด"
            className="rounded-md p-2 hover:bg-white/15"
          >
            <Download className="size-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-md p-2 hover:bg-white/15"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt={name}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
        />
      </div>
    </div>
  );
}
