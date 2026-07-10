import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { DataProvider } from "@/lib/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DataProvider>
        <AppShell>{children}</AppShell>
      </DataProvider>
    </RequireAuth>
  );
}
