import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: React.ReactNode;
  /** Right-aligned trailing content, e.g. a result count. */
  trailing?: React.ReactNode;
  className?: string;
};

/** Horizontal filter row (date pickers, selects) inside a bordered card. */
export function FilterBar({ children, trailing, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-[10px] border border-zinc-200 bg-white px-3 py-2.5",
        className
      )}
    >
      {children}
      {trailing && (
        <>
          <div className="flex-1" />
          <span className="text-xs text-zinc-400">{trailing}</span>
        </>
      )}
    </div>
  );
}
