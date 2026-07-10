"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  FileText,
  KanbanSquare,
  CalendarClock,
  CalendarDays,
  Users,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NAV_ITEMS, CURRENT_USER } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  KanbanSquare,
  CalendarClock,
  CalendarDays,
  Users,
  SlidersHorizontal,
};

export function Sidebar() {
  const pathname = usePathname();
  const { pendingLeaveCount: pending } = useData();

  return (
    <nav className="flex w-[232px] flex-none flex-col border-r border-zinc-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
        <div className="flex size-[30px] items-center justify-center rounded-lg bg-teal-600">
          <Activity className="size-[17px] text-white" strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold tracking-[-0.02em]">DevPulse</span>
      </div>

      {/* Nav */}
      <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = item.id === "leaves" && pending > 0 ? pending : null;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                active
                  ? "bg-teal-50 font-semibold text-teal-700"
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
        <Avatar userKey={CURRENT_USER.key} size={30} />
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold">
            {CURRENT_USER.name}
          </div>
          <div className="text-[11px] text-zinc-400">{CURRENT_USER.role}</div>
        </div>
      </div>
    </nav>
  );
}
