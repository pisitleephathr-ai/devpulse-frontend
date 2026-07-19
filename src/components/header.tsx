"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { PAGE_TITLES } from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { clearSession } from "@/lib/auth";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useCurrentUser();
  const meKey = me?.avatarKey ?? "?";
  const meName = me?.name ?? "…";
  const meEmail = me?.email ?? "";
  const segment = pathname.split("/")[1] || "dashboard";
  const title = PAGE_TITLES[segment] ?? "DevPulse";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="flex h-[58px] flex-none items-center gap-2.5 border-b border-border bg-card px-4 sm:gap-4 sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="เปิดเมนู"
        className="flex size-9 flex-none items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-muted lg:hidden dark:text-zinc-300"
      >
        <Menu className="size-5" strokeWidth={1.9} />
      </button>
      <div className="truncate text-[15.5px] font-semibold tracking-[-0.01em]">
        {title}
      </div>
      <div className="flex-1" />

      {/* Global search (Cmd/Ctrl+K) */}
      <GlobalSearch />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <NotificationBell />

      {/* Account menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="บัญชีผู้ใช้"
          aria-expanded={menuOpen}
        >
          <Avatar userKey={meKey} name={me?.name} size={30} className="cursor-pointer" />
        </button>
        {menuOpen && (
          <div className="dp-menu absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3">
              <Avatar userKey={meKey} name={me?.name} size={32} />
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold">
                  {meName}
                </div>
                <div className="truncate font-mono text-[11px] text-zinc-400">
                  {meEmail}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <UserIcon className="size-4 text-zinc-500" />
              โปรไฟล์ของฉัน
            </button>
            <button
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2.5 border-t border-hairline px-3.5 py-2.5 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="size-4" />
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
