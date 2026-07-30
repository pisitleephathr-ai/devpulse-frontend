"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle } from "lucide-react";

/*
  Minimal dependency-free toast matching the handoff's dark pill.
  `toast(message)` shows a success pill; `toast(message, "error")` shows a
  failure pill (red icon, alert role). Can be called from anywhere (event
  emitter, no provider). Multiple toasts stack instead of replacing each other.
*/

export type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(message: string, variant: ToastVariant = "success") {
  const item: ToastItem = { id: ++counter, message, variant };
  listeners.forEach((l) => l(item));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setToasts((prev) => [...prev, t]);
      // Errors linger a little longer so they're not missed.
      const ttl = t.variant === "error" ? 4200 : 2800;
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
        ttl
      );
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
            t.variant === "error" ? "bg-red-700" : "bg-zinc-900"
          }`}
          style={{ animation: "dp-toast 0.25s ease" }}
        >
          {t.variant === "error" ? (
            <AlertCircle className="size-[15px] text-red-200" strokeWidth={2.4} />
          ) : (
            <Check className="size-[15px] text-emerald-400" strokeWidth={2.4} />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
