import { AlertTriangle } from "lucide-react";

/** Minimal shape needed to render a report item's progress row. */
export type DisplayReportItem = {
  id: string;
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
