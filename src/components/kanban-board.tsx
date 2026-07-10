"use client";

import { useState } from "react";
import { Plus, FileText, Link2, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import {
  PRIORITY_COLORS,
  type KanbanColumn,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type KanbanBoardProps = {
  columns: KanbanColumn[];
  onCardClick: (task: Task) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onAddInColumn: (status: TaskStatus) => void;
  /** show the per-column "+" add buttons (managers/admins). */
  showAdd?: boolean;
  /** whether a given card may be dragged (RBAC). Defaults to always. */
  canDrag?: (task: Task) => boolean;
};

/** Kanban with HTML5 drag-and-drop between columns + click-to-open cards. */
export function KanbanBoard({
  columns,
  onCardClick,
  onDropTask,
  onAddInColumn,
  showAdd = true,
  canDrag,
}: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  return (
    <div className="grid flex-1 items-start gap-3.5 overflow-x-auto pb-2 [grid-template-columns:repeat(4,minmax(230px,1fr))]">
      {columns.map((col) => (
        <div
          key={col.name}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(col.name);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.name ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain") || dragId;
            if (id) onDropTask(id, col.name);
            setOverCol(null);
            setDragId(null);
          }}
          className={cn(
            "flex flex-col gap-2.5 rounded-xl bg-zinc-100 p-2.5 transition-colors",
            overCol === col.name && "bg-teal-50 ring-1 ring-teal-200"
          )}
        >
          <div className="flex items-center gap-2 px-1.5 py-0.5">
            <span
              className="size-2 rounded-full"
              style={{ background: col.dot }}
              aria-hidden
            />
            <span className="flex-1 text-[12.5px] font-semibold text-zinc-900">
              {col.name}
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-2 py-px text-[11.5px] font-semibold text-zinc-500">
              {col.cards.length}
            </span>
            {showAdd && (
              <button
                onClick={() => onAddInColumn(col.name)}
                className="flex size-5 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white hover:text-teal-600"
                aria-label={`เพิ่มงานใน ${col.name}`}
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </div>

          {col.cards.map((card) => {
            const draggable = canDrag ? canDrag(card) : true;
            return (
            <div
              key={card.id}
              draggable={draggable}
              onDragStart={(e) => {
                if (!draggable) return;
                e.dataTransfer.setData("text/plain", card.id);
                e.dataTransfer.effectAllowed = "move";
                setDragId(card.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverCol(null);
              }}
              onClick={() => onCardClick(card)}
              className={cn(
                "rounded-[10px] border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:border-zinc-300 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)]",
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                dragId === card.id && "opacity-50"
              )}
            >
              <div
                className="mb-1.5 font-mono text-[11px] font-semibold"
                style={{ color: card.projFg }}
              >
                {card.proj}
              </div>
              {/* Full title — wraps to multiple lines, never truncated. */}
              <div className="mb-2.5 whitespace-normal break-words text-[13px] font-medium leading-normal text-zinc-900 [overflow-wrap:anywhere]">
                {card.title}
              </div>
              <div className="flex items-center gap-2">
                <Avatar userKey={card.key} size={22} fontSize={9} />
                <StatusBadge
                  label={card.pri}
                  colors={PRIORITY_COLORS[card.pri]}
                  shape="tag"
                  className="text-[10.5px]"
                />
                {(card.description ||
                  card.linkCount > 0 ||
                  card.attachmentCount > 0) && (
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    {card.description && <FileText className="size-3" />}
                    {card.linkCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Link2 className="size-3" />
                        {card.linkCount}
                      </span>
                    )}
                    {card.attachmentCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Paperclip className="size-3" />
                        {card.attachmentCount}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1" />
                <span className="text-[11px] text-zinc-400">{card.due}</span>
              </div>
            </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
