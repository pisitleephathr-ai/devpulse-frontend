"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Presentation,
  FileText,
  KanbanSquare,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  BarChart3,
  Pencil,
  Check,
  X,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { canAccessMenu, isCommonMenu, isAdmin } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { roleNameOf } from "@/lib/mappers";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import {
  resolveMenu,
  MENU_UPDATED_EVENT,
  type MenuConfigItem,
  type ResolvedMenuItem,
} from "@/lib/menu";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Presentation,
  FileText,
  KanbanSquare,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  Activity,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  BarChart3,
};

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { pendingLeaveCount: pending } = useData();
  const me = useCurrentUser();
  const admin = isAdmin(me);
  // Neutral placeholders before the real user loads (avoid flashing a fake name).
  const meKey = me?.avatarKey ?? "?";
  const meName = me?.name ?? "…";
  const meRole = me ? roleNameOf(me.role) : "";

  // Menu items resolved from the saved config (falls back to code defaults).
  const [menu, setMenu] = useState<ResolvedMenuItem[]>(() => resolveMenu([]));
  useEffect(() => {
    let active = true;
    const loadMenu = () => {
      api
        .get<{ menu: MenuConfigItem[] }>("/api/settings/menu")
        .then((r) => active && setMenu(resolveMenu(r.menu)))
        .catch(() => active && setMenu(resolveMenu([])));
    };
    loadMenu();
    // Refresh live when the menu config is saved (here or elsewhere).
    window.addEventListener(MENU_UPDATED_EVENT, loadMenu);
    return () => {
      active = false;
      window.removeEventListener(MENU_UPDATED_EVENT, loadMenu);
    };
  }, []);

  // ----- inline edit mode (admins) -----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ResolvedMenuItem[]>([]);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(menu.map((m) => ({ ...m })));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft([]);
  }
  function moveDraft(i: number, dir: -1 | 1) {
    setDraft((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  const setDraftLabel = (i: number, v: string) =>
    setDraft((prev) => prev.map((m, k) => (k === i ? { ...m, label: v } : m)));
  const toggleDraftVisible = (i: number) =>
    setDraft((prev) => prev.map((m, k) => (k === i ? { ...m, isVisible: !m.isVisible } : m)));
  const resetDraftLabel = (i: number) =>
    setDraft((prev) => prev.map((m, k) => (k === i ? { ...m, label: m.defaultLabel } : m)));

  async function saveDraft() {
    if (draft.some((m) => !m.label.trim())) {
      toast("ชื่อเมนูห้ามว่าง");
      return;
    }
    setSaving(true);
    try {
      const config = draft.map((m, i) => ({
        key: m.key,
        customLabel: m.label.trim() === m.defaultLabel ? null : m.label.trim(),
        order: i,
        isVisible: m.isLocked ? true : m.isVisible,
      }));
      const r = await api.patch<{ menu: MenuConfigItem[] }>("/api/settings/menu", { menu: config });
      setMenu(resolveMenu(r.menu));
      window.dispatchEvent(new Event(MENU_UPDATED_EVENT));
      setEditing(false);
      setDraft([]);
      toast("บันทึกเมนูแล้ว");
    } catch {
      toast("บันทึกเมนูไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }
  async function resetDraft() {
    setSaving(true);
    try {
      const r = await api.post<{ menu: MenuConfigItem[] }>("/api/settings/menu/reset", {});
      const resolved = resolveMenu(r.menu);
      setMenu(resolved);
      setDraft(resolved.map((m) => ({ ...m })));
      window.dispatchEvent(new Event(MENU_UPDATED_EVENT));
      toast("รีเซ็ตเมนูเป็นค่าเริ่มต้นแล้ว");
    } catch {
      toast("รีเซ็ตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <nav
      className={cn(
        "flex w-[232px] flex-none flex-col border-r border-border bg-card",
        // Desktop: static in flow. Mobile: off-canvas drawer.
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
        <div className="flex size-[30px] items-center justify-center rounded-lg bg-teal-600">
          <Activity className="size-[17px] text-white" strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold tracking-[-0.02em]">DevPulse</span>
      </div>

      {/* Nav */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-2">
        {editing
          ? draft.map((item, i) => {
              const Icon = ICONS[item.iconKey] ?? SlidersHorizontal;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-1 rounded-lg px-1 py-1"
                >
                  <div className="flex flex-none flex-col">
                    <button
                      onClick={() => moveDraft(i, -1)}
                      disabled={i === 0}
                      className="flex size-4 items-center justify-center rounded text-zinc-400 hover:bg-muted disabled:opacity-30"
                      aria-label="เลื่อนขึ้น"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      onClick={() => moveDraft(i, 1)}
                      disabled={i === draft.length - 1}
                      className="flex size-4 items-center justify-center rounded text-zinc-400 hover:bg-muted disabled:opacity-30"
                      aria-label="เลื่อนลง"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                  <Icon className="size-[15px] flex-none text-zinc-400" strokeWidth={1.8} />
                  <input
                    value={item.label}
                    onChange={(e) => setDraftLabel(i, e.target.value)}
                    className={cn(
                      "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] outline-none hover:border-border focus:border-teal-500 focus:bg-background",
                      !item.isVisible && "text-zinc-400 line-through"
                    )}
                    aria-label={`ชื่อเมนู ${item.defaultLabel}`}
                  />
                  {item.label.trim() !== item.defaultLabel && (
                    <button
                      onClick={() => resetDraftLabel(i)}
                      className="flex-none rounded p-0.5 text-zinc-400 hover:bg-muted"
                      aria-label="คืนชื่อเดิม"
                      title={`คืนเป็น "${item.defaultLabel}"`}
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                  {item.isLocked ? (
                    <span
                      className="flex size-6 flex-none items-center justify-center text-zinc-300 dark:text-zinc-600"
                      title="เมนูระบบ ซ่อนไม่ได้"
                    >
                      <Lock className="size-3.5" />
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleDraftVisible(i)}
                      className={cn(
                        "flex size-6 flex-none items-center justify-center rounded hover:bg-muted",
                        item.isVisible ? "text-teal-600" : "text-zinc-400"
                      )}
                      aria-label={item.isVisible ? `ซ่อน ${item.label}` : `แสดง ${item.label}`}
                      title={item.isVisible ? "แสดงอยู่" : "ซ่อนอยู่"}
                    >
                      {item.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                  )}
                </div>
              );
            })
          : menu
              .filter((item) => item.isVisible)
              .filter((item) => (me ? canAccessMenu(me, item.key) : isCommonMenu(item.key)))
              .map((item) => {
                const Icon = ICONS[item.iconKey] ?? SlidersHorizontal;
                const active =
                  item.href === "/settings"
                    ? pathname === "/settings"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                const badge = item.key === "leaves" && pending > 0 ? pending : null;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                      active
                        ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                        : "font-medium text-zinc-700 hover:bg-zinc-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[17px]",
                        active ? "text-teal-600" : "text-zinc-500"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span className="rounded-full bg-amber-100 px-[7px] py-px text-[11px] font-semibold text-amber-700">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
      </div>

      {/* Menu edit controls (admins only) */}
      {admin && (
        <div className="border-t border-hairline px-2.5 py-2">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-teal-600 px-2 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                >
                  <Check className="size-3.5" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[12.5px] font-medium text-zinc-600 transition-colors hover:bg-muted disabled:opacity-50 dark:text-zinc-300"
                >
                  <X className="size-3.5" /> ยกเลิก
                </button>
              </div>
              <button
                onClick={resetDraft}
                disabled={saving}
                className="flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-zinc-400 transition-colors hover:bg-muted hover:text-zinc-600 disabled:opacity-50"
              >
                <RotateCcw className="size-3" /> รีเซ็ตเป็นค่าเริ่มต้น
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            >
              <Pencil className="size-[15px]" strokeWidth={1.8} />
              แก้ไขเมนู
            </button>
          )}
        </div>
      )}

      {/* Current user */}
      <div className="flex items-center gap-2.5 border-t border-hairline px-3.5 py-3">
        <Avatar userKey={meKey} name={me?.name} size={30} />
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold">{meName}</div>
          <div className="text-[11px] text-zinc-400">{meRole}</div>
        </div>
      </div>
    </nav>
  );
}
