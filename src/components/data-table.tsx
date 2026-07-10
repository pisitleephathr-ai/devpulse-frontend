"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

type TableCtx = { template: string; minWidth: number };
const TableContext = createContext<TableCtx>({ template: "1fr", minWidth: 0 });

type DataTableProps = {
  /** CSS grid-template-columns value. */
  template: string;
  /** Min width before horizontal scroll kicks in. */
  minWidth: number;
  headers: React.ReactNode[];
  children: React.ReactNode;
  className?: string;
};

/**
 * CSS-grid data table matching the handoff. Header + rows share a grid
 * template via context; the whole thing scrolls horizontally on narrow screens.
 */
export function DataTable({
  template,
  minWidth,
  headers,
  children,
  className,
}: DataTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <TableContext.Provider value={{ template, minWidth }}>
        <div
          className="grid gap-3 border-b border-hairline bg-zinc-50 px-[18px] py-2.5 text-[11.5px] font-semibold tracking-[0.02em] text-zinc-500"
          style={{ gridTemplateColumns: template, minWidth }}
        >
          {headers.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>
        {children}
      </TableContext.Provider>
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { template, minWidth } = useContext(TableContext);
  return (
    <div
      className={cn(
        "grid items-center gap-3 border-b border-hairline-soft px-[18px] py-[11px] transition-colors last:border-b-0 hover:bg-zinc-50",
        className
      )}
      style={{ gridTemplateColumns: template, minWidth }}
    >
      {children}
    </div>
  );
}
