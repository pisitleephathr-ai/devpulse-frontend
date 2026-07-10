"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/*
  Minimal dependency-free toast matching the handoff's dark pill.
  `toast(message)` can be called from anywhere (event-emitter, no provider).
*/

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function toast(message: string) {
  listeners.forEach((l) => l(message));
}

export function Toaster() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const listener: Listener = (msg) => {
      setMessage(msg);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(""), 2600);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-[10px] bg-zinc-900 px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      style={{ animation: "dp-toast 0.25s ease" }}
    >
      <Check className="size-[15px] text-emerald-400" strokeWidth={2.4} />
      {message}
    </div>
  );
}
