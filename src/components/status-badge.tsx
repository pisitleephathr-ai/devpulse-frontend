import { statusColors } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  /** Override colors (e.g. leave-type / role / priority maps). */
  colors?: [string, string];
  /** "pill" = fully rounded (statuses); "tag" = small rounded (types/priorities). */
  shape?: "pill" | "tag";
  className?: string;
};

/** Colored status chip. Defaults to the shared STATUS_BADGES map. */
export function StatusBadge({
  label,
  colors,
  shape = "pill",
  className,
}: StatusBadgeProps) {
  const [bg, fg] = colors ?? statusColors(label);
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold",
        shape === "pill"
          ? "rounded-full px-[9px] py-0.5 text-[11.5px]"
          : "rounded-[5px] px-2 py-0.5 text-xs",
        className
      )}
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}
