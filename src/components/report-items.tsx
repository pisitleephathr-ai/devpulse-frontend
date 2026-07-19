import { AlertTriangle } from "lucide-react";

/** Minimal shape needed to render a report item's progress row. */
export type DisplayReportItem = {
  id: string;
  section?: "DID" | "PLAN";
  title: string;
  progress: number;
  note: string;
  task?: { proj: string; projColor: string } | null;
};

const barColor = (p: number) =>
  p >= 100 ? "bg-emerald-500" : p >= 50 ? "bg-teal-500" : "bg-amber-500";
const textColor = (p: number) =>
  p >= 100 ? "text-emerald-600" : p >= 50 ? "text-teal-600" : "text-amber-600";

/** A daily report's per-task items: work + progress bar + optional note. */
export function ReportItemsList({
  items,
  compact = false,
}: {
  items: DisplayReportItem[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2.5"}>
      {items.map((it) => (
        <div key={it.id}>
          <div className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              {it.task && (
                <span
                  className="flex-none font-mono text-[10px] font-semibold"
                  style={{ color: it.task.projColor }}
                >
                  {it.task.proj}
                </span>
              )}
              <span className="truncate text-foreground">{it.title}</span>
            </span>
            <span className={`flex-none font-semibold tabular-nums ${textColor(it.progress)}`}>
              {it.progress}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barColor(it.progress)}`}
              style={{ width: `${it.progress}%` }}
            />
          </div>
          {it.note.trim() && (
            <div className="mt-1 flex items-start gap-1 text-[11.5px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3 flex-none" />
              <span className="min-w-0">{it.note}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Report items split into the two sections (งานที่ทำล่าสุด / แผนงานวันนี้). Falls
 * back to a single list when no items carry a section (older data).
 */
export function ReportItemsSections({ items }: { items: DisplayReportItem[] }) {
  const did = items.filter((i) => i.section !== "PLAN");
  const plan = items.filter((i) => i.section === "PLAN");
  if (!plan.length) return <ReportItemsList items={items} />;
  return (
    <div className="flex flex-col gap-3">
      {did.length > 0 && (
        <div>
          <SectionLabel dot="#0d9488" label="งานที่ทำล่าสุด" n={did.length} />
          <ReportItemsList items={did} compact />
        </div>
      )}
      {plan.length > 0 && (
        <div>
          <SectionLabel dot="#2563eb" label="แผนงานวันนี้" n={plan.length} />
          <ReportItemsList items={plan} compact />
        </div>
      )}
    </div>
  );
}

function SectionLabel({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      <span className="size-2 rounded-full" style={{ background: dot }} />
      {label} ({n})
    </div>
  );
}
