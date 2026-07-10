import { cn } from "@/lib/utils";

/** Subtle pulsing placeholder block. Uses the theme's muted token (light+dark). */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
      {...props}
    />
  );
}
