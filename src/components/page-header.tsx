import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Mono eyebrow, e.g. "DAILY REPORTS". */
  eyebrow: string;
  title: string;
  /** Optional descriptive line under the title. */
  description?: string;
  /** Right-aligned actions (buttons, selects). */
  actions?: React.ReactNode;
  className?: string;
};

/** Standard page title block: mono eyebrow + heading, optional actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1">
        <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-teal-600">
          {eyebrow}
        </div>
        <h1 className="text-[19px] font-bold tracking-[-0.02em] text-zinc-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
