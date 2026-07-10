"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DataStatusBanner } from "@/components/data-status-banner";
import { PageTransition } from "@/components/page-transition";

/**
 * App chrome. On desktop the sidebar is static; on tablet/mobile it collapses
 * into a slide-in drawer toggled from the header hamburger and closed on
 * navigation or backdrop click.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="dp-scrim fixed inset-0 z-40 bg-zinc-900/40 lg:hidden"
          aria-hidden
        />
      )}

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setNavOpen(true)} />
        <DataStatusBanner />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
