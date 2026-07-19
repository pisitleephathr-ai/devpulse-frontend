"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { FALLBACK_CONFIG, type UploadConfig } from "./upload-config";

/**
 * Fetch the upload limits + allowlists from the backend (the source of truth).
 * Falls back to FALLBACK_CONFIG only while loading / if the request fails, so the
 * UI is never blocked. Cached module-wide so it's fetched once per session.
 */
let cached: UploadConfig | null = null;
let inflight: Promise<UploadConfig> | null = null;

async function loadConfig(): Promise<UploadConfig> {
  if (cached) return cached;
  if (!inflight) {
    inflight = api
      .get<UploadConfig>("/api/uploads/config")
      .then((c) => {
        cached = c;
        return c;
      })
      .catch(() => FALLBACK_CONFIG)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useUploadConfig(): { config: UploadConfig; loaded: boolean } {
  const [config, setConfig] = useState<UploadConfig>(cached ?? FALLBACK_CONFIG);
  const [loaded, setLoaded] = useState<boolean>(!!cached);

  useEffect(() => {
    let active = true;
    loadConfig().then((c) => {
      if (active) {
        setConfig(c);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { config, loaded };
}
