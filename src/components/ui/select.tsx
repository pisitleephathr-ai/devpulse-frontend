import * as React from "react";
import { cn } from "@/lib/utils";

// Consistent chevron across platforms (zinc-400), embedded as a data URI.
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

/** Native <select> styled to match the handoff. Full width by default. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full cursor-pointer appearance-none rounded-lg border border-zinc-300 bg-white bg-[length:14px] bg-[right_10px_center] bg-no-repeat py-[9px] pl-3 pr-8 text-[13px] text-zinc-700 focus-visible:outline-none",
      className
    )}
    style={{ backgroundImage: CHEVRON, ...style }}
    {...props}
  />
));
Select.displayName = "Select";
