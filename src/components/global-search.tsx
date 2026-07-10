"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  KanbanSquare,
  FileText,
  Users,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";

type ResultType = "TASK" | "REPORT" | "USER" | "PROJECT" | "LEAVE" | "CALENDAR";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, unknown>;
};

const TYPE_META: Record<ResultType, { label: string; icon: LucideIcon; order: number }> = {
  TASK: { label: "งาน", icon: KanbanSquare, order: 0 },
  REPORT: { label: "รายงาน", icon: FileText, order: 1 },
  USER: { label: "ผู้ใช้", icon: Users, order: 2 },
  PROJECT: { label: "โปรเจกต์", icon: FolderKanban, order: 3 },
  LEAVE: { label: "การลา", icon: CalendarClock, order: 4 },
  CALENDAR: { label: "ปฏิทิน", icon: CalendarDays, order: 5 },
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K toggles the dialog anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset + focus on open.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setQ("");
    setResults([]);
    setActive(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  // Debounced search.
  useEffect(() => {
    const query = q.trim();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => {
          if (!active) return;
          setResults(r.results);
          setActive(0);
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q]);

  // Stable ordering grouped by type; keep a flat list for keyboard nav.
  const grouped = useMemo(() => {
    const byType = new Map<ResultType, SearchResult[]>();
    for (const r of results) {
      (byType.get(r.type) ?? byType.set(r.type, []).get(r.type)!).push(r);
    }
    return [...byType.entries()].sort(
      (a, b) => TYPE_META[a[0]].order - TYPE_META[b[0]].order
    );
  }, [results]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  const go = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      router.push(r.url);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  }

  return (
    <>
      {/* Trigger — looks like the old search box but actually opens the dialog */}
      <button
        onClick={() => setOpen(true)}
        className="hidden w-[220px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-200/70 sm:flex"
        aria-label="ค้นหา (เปิดด้วย Ctrl+K)"
      >
        <Search className="size-3.5 text-zinc-400" strokeWidth={2} />
        <span className="flex-1 text-[13px] text-zinc-400">ค้นหา…</span>
        <span className="rounded border border-zinc-200 bg-white px-[5px] py-px font-mono text-[10.5px] text-zinc-400">
          ⌘K
        </span>
      </button>

      {/* Mobile: icon-only trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex size-[34px] items-center justify-center rounded-lg border border-zinc-200 bg-white transition-colors hover:bg-zinc-100 sm:hidden"
        aria-label="ค้นหา"
      >
        <Search className="size-4 text-zinc-600" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          onMouseDown={() => setOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-900/40 p-4 pt-[12vh]"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            role="dialog"
            aria-label="ค้นหาทั่วทั้งระบบ"
            className="w-[560px] max-w-full overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            {/* Input */}
            <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
              <Search className="size-4 flex-none text-zinc-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหางาน รายงาน ผู้ใช้ โปรเจกต์…"
                className="min-w-0 flex-1 border-none bg-transparent p-0 text-[14px] outline-none placeholder:text-zinc-400"
              />
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-400">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[52vh] overflow-y-auto py-1.5">
              {!q.trim() ? (
                <div className="px-4 py-8 text-center text-[12.5px] text-zinc-400">
                  พิมพ์เพื่อค้นหางาน รายงาน ผู้ใช้ โปรเจกต์ การลา และปฏิทิน
                </div>
              ) : loading && results.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12.5px] text-zinc-400">
                  กำลังค้นหา…
                </div>
              ) : flat.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12.5px] text-zinc-400">
                  ไม่พบผลลัพธ์
                </div>
              ) : (
                grouped.map(([type, items]) => {
                  const Icon = TYPE_META[type].icon;
                  return (
                    <div key={type} className="mb-1">
                      <div className="px-4 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">
                        {TYPE_META[type].label}
                      </div>
                      {items.map((r) => {
                        const idx = flat.indexOf(r);
                        const isActive = idx === active;
                        return (
                          <button
                            key={r.id}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go(r)}
                            className={`flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                              isActive ? "bg-teal-50" : "hover:bg-zinc-50"
                            }`}
                          >
                            <span
                              className={`flex size-7 flex-none items-center justify-center rounded-lg ${
                                isActive ? "bg-teal-100 text-teal-600" : "bg-zinc-100 text-zinc-400"
                              }`}
                            >
                              <Icon className="size-[15px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium">{r.title}</div>
                              {r.subtitle && (
                                <div className="truncate text-[11.5px] text-zinc-400">{r.subtitle}</div>
                              )}
                            </div>
                            {isActive && (
                              <CornerDownLeft className="size-3.5 flex-none text-zinc-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
