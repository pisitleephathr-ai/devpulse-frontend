"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  KanbanSquare,
  CalendarClock,
  FileText,
  BellOff,
  X,
  Trash2,
} from "lucide-react";
import {
  useNotifications,
  notificationHref,
  type ApiNotification,
} from "@/lib/use-notifications";
import { relativeTimeTh, cn } from "@/lib/utils";

const ENTITY_ICON: Record<string, typeof KanbanSquare> = {
  task: KanbanSquare,
  leave: CalendarClock,
  report: FileText,
};

export function NotificationBell() {
  const router = useRouter();
  const { items, unread, loading, error, markRead, markAllRead, remove, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  function onClickItem(n: ApiNotification) {
    if (!n.isRead) void markRead(n.id);
    const href = notificationHref(n);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-[34px] items-center justify-center rounded-lg border border-zinc-200 bg-white transition-colors hover:bg-zinc-100"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
      >
        <Bell className="size-4 text-zinc-600" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full border-[1.5px] border-white bg-rose-600 px-1 text-[10px] font-bold leading-[15px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="dp-menu absolute right-0 top-[calc(100%+8px)] z-40 w-[340px] overflow-hidden rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-hairline px-3.5 py-2.5">
            <span className="text-[13px] font-semibold">การแจ้งเตือน</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-teal-600 hover:underline"
                >
                  <CheckCheck className="size-3.5" />
                  อ่านทั้งหมด
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={() => clearAll()}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-zinc-500 hover:text-red-600 hover:underline"
                >
                  <Trash2 className="size-3.5" />
                  ลบทั้งหมด
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-zinc-400">
                กำลังโหลด…
              </div>
            ) : error && items.length === 0 ? (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-zinc-400">
                โหลดการแจ้งเตือนไม่สำเร็จ
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3.5 py-9 text-center">
                <BellOff className="size-6 text-zinc-300" />
                <span className="text-[12.5px] text-zinc-400">
                  ยังไม่มีการแจ้งเตือน
                </span>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ENTITY_ICON[n.entityType ?? ""] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative border-b border-hairline-soft transition-colors last:border-b-0 hover:bg-zinc-50",
                      !n.isRead && "bg-teal-50/40"
                    )}
                  >
                    <button
                      onClick={() => onClickItem(n)}
                      className="flex w-full gap-2.5 px-3.5 py-2.5 pr-8 text-left"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 flex-none items-center justify-center rounded-lg",
                          n.isRead
                            ? "bg-zinc-100 text-zinc-400"
                            : "bg-teal-100 text-teal-600"
                        )}
                      >
                        <Icon className="size-[15px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-semibold text-zinc-800">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="size-1.5 flex-none rounded-full bg-teal-500" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-500">
                          {n.message}
                        </p>
                        <span className="mt-0.5 block text-[11px] text-zinc-400">
                          {relativeTimeTh(n.createdAt)}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => void remove(n.id)}
                      aria-label="ลบการแจ้งเตือน"
                      className="absolute right-1.5 top-2 rounded p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
