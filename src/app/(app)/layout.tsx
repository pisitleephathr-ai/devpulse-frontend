import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/lib/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
