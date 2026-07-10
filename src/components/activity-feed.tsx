import type { ActivityItem } from "@/lib/mock-data";

/** Vertical team activity list with a colored dot per item. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="py-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-[11px] px-[18px] py-[9px]">
          <span
            className="mt-[5px] size-2 flex-none rounded-full"
            style={{ background: item.dot }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] leading-normal text-zinc-700">
              <strong className="font-semibold text-zinc-900">
                {item.who}
              </strong>{" "}
              {item.what}
            </div>
            <div className="mt-0.5 text-[11.5px] text-zinc-400">
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
