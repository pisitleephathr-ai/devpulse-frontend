import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
