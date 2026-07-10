import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { RouteGuard } from "@/components/route-guard";
import { DataProvider } from "@/lib/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DataProvider>
        <AppShell>
          <RouteGuard>{children}</RouteGuard>
        </AppShell>
      </DataProvider>
    </RequireAuth>
  );
}
