import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Centered empty placeholder for tables/lists with no rows. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="text-[14px] font-semibold text-zinc-900">{title}</div>
      {description && (
        <p className="mt-1 max-w-xs text-[12.5px] text-zinc-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
