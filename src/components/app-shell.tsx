import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DataStatusBanner } from "@/components/data-status-banner";

/** App chrome: fixed sidebar + header, scrollable main content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <DataStatusBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
