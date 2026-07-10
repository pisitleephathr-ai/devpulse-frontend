import { Skeleton } from "@/components/ui/skeleton";

/* Reusable, layout-matching skeletons. Each mirrors the real content's shape
   so there is no layout jump when data arrives. */

/** Rows for a DataTable (users, roles, leaves). */
export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-hairline-soft px-[18px] py-3 last:border-b-0"
        >
          <Skeleton className="size-7 flex-none rounded-full" />
          <Skeleton className="h-3 w-[30%]" />
          <Skeleton className="h-3 w-[24%]" />
          <div className="flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Responsive grid of card skeletons (reports, projects). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 flex-none rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2 pt-1">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-5/6" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kanban board columns with card placeholders (tasks). */
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from({ length: columns }).map((_, c) => (
        <div key={c} className="flex w-[280px] flex-none flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {Array.from({ length: 3 - (c % 2) }).map((_, i) => (
            <div
              key={i}
              className="space-y-2.5 rounded-xl border border-border bg-card p-3"
            >
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-2.5 w-1/2" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-12 rounded-full" />
                <div className="flex-1" />
                <Skeleton className="size-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Month grid placeholder (calendar). */
export function CalendarSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-hairline">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-center p-2.5">
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="min-h-24 border-b border-r border-hairline-soft p-2"
          >
            <Skeleton className="mb-2 size-6 rounded-full" />
            {i % 3 === 0 && <Skeleton className="h-4 w-full rounded" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Profile: header card + two form cards. */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-[22px]">
        <Skeleton className="size-14 flex-none rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Generic stacked form-section skeleton (settings). */
export function FormSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: sections }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-2/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
