"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { ApiTaskAttachment } from "./mappers";
import type { AttachmentUsage, UploadLimits } from "./upload-config";

export type UsageResponse = {
  usage: AttachmentUsage;
  limits: { maxFiles: number; maxTotalBytes: number };
};

/**
 * Load + track a task's attachments and its usage together, exposing a single
 * `refresh()` the upload/delete flows call after a mutation. Usage is always
 * recomputed from the backend (never derived on the client).
 */
export function useTaskAttachments(taskId: string, initial: ApiTaskAttachment[] = []) {
  const [attachments, setAttachments] = useState<ApiTaskAttachment[]>(initial);
  const [usage, setUsage] = useState<AttachmentUsage | null>(null);
  const [limits, setLimits] = useState<Pick<UploadLimits, never> & { maxFiles: number; maxTotalBytes: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, usageRes] = await Promise.all([
        api.get<{ task: { attachments: ApiTaskAttachment[] } }>(`/api/tasks/${taskId}`),
        api.get<UsageResponse>(`/api/tasks/${taskId}/attachments/usage`),
      ]);
      setAttachments(detail.task.attachments ?? []);
      setUsage(usageRes.usage);
      setLimits(usageRes.limits);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { attachments, usage, limits, loading, refresh, setAttachments };
}
