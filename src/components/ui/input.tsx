import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-zinc-300 bg-white px-3 py-[9px] text-[13px] text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
