"use client";

import { useState } from "react";
import { thumbUrlOf } from "@/lib/upload-config";

type Props = {
  /** Server-provided thumbnail; falls back to a derived one from secureUrl. */
  thumbnailUrl?: string | null;
  secureUrl: string;
  name: string;
  onOpen: () => void;
};

/**
 * Board/grid image thumbnail. Uses a small Cloudinary-transformed image (never
 * the original), lazy-loaded, in a fixed 16:9 box so the layout never jumps.
 * Click / Enter / Space opens the lightbox.
 */
export function ImageThumbnail({ thumbnailUrl, secureUrl, name, onOpen }: Props) {
  const [errored, setErrored] = useState(false);
  const src = thumbnailUrl || thumbUrlOf(secureUrl);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`ดูรูป ${name}`}
      className="group block w-full overflow-hidden rounded-lg border border-hairline bg-card text-left transition hover:border-teal-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70"
    >
      <div className="relative aspect-video w-full bg-muted">
        {errored ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
            แสดงรูปไม่ได้
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="truncate px-2 py-1 text-[11px] text-muted-foreground" title={name}>
        {name}
      </div>
    </button>
  );
}
