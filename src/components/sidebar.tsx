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
  type LucideIcon,
} from "lucide-react";
import { canAccessMenu, isCommonMenu } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { roleNameOf } from "@/lib/mappers";
import { api } from "@/lib/api";
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
    // Refresh live when the settings page saves a new menu config.
    window.addEventListener(MENU_UPDATED_EVENT, loadMenu);
    return () => {
      active = false;
      window.removeEventListener(MENU_UPDATED_EVENT, loadMenu);
    };
  }, []);

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
      <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
        {menu
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

      {/* Current user */}
      <div className="flex items-center gap-2.5 border-t border-hairline px-3.5 py-3">
        <Avatar userKey={meKey} size={30} />
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold">{meName}</div>
          <div className="text-[11px] text-zinc-400">{meRole}</div>
        </div>
      </div>
    </nav>
  );
}
