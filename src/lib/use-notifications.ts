"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { getToken } from "./auth";

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Map a notification's entity to the page it should open. */
export function notificationHref(n: ApiNotification): string | null {
  switch (n.entityType) {
    case "task":
      return "/tasks";
    case "leave":
      return "/leaves";
    case "report":
      return "/reports";
    default:
      return null;
  }
}

const POLL_MS = 45_000;

/**
 * Notifications for the current user with light polling. No websockets —
 * refetches the list + unread count every 45s and on demand.
 */
export function useNotifications() {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [list, count] = await Promise.all([
        api.get<{ notifications: ApiNotification[] }>("/api/notifications"),
        api.get<{ count: number }>("/api/notifications/unread-count"),
      ]);
      setItems(list.notifications);
      setUnread(count.count);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      loadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.patch(`/api/notifications/${id}/read`);
    } catch {
      /* optimistic; next poll reconciles */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await api.patch("/api/notifications/read-all");
    } catch {
      /* optimistic; next poll reconciles */
    }
  }, []);

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}
