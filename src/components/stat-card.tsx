import { Card } from "@/components/ui/card";
import type { Stat } from "@/lib/mock-data";

/** Dashboard KPI card: label + status dot, big value, sub-line. */
export function StatCard({ label, value, sub, dot }: Stat) {
  return (
    <Card className="px-[18px] py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-zinc-500">{label}</span>
        <span
          className="size-2 rounded-full"
          style={{ background: dot }}
          aria-hidden
        />
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-0.03em] text-zinc-900">
        {value}
      </div>
      <div className="mt-[7px] text-xs text-zinc-400">{sub}</div>
    </Card>
  );
}
