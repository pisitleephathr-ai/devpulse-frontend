"use client";

import { useState } from "react";
import { Plus, FileText, Link2, Paperclip, Check, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import {
  PRIORITY_COLORS,
  type KanbanColumn,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { dueUrgency } from "@/lib/thai-datetime";

type KanbanBoardProps = {
  columns: KanbanColumn[];
  onCardClick: (task: Task) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onAddInColumn: (status: TaskStatus) => void;
  /** show the per-column "+" add buttons (managers/admins). */
  showAdd?: boolean;
  /** whether a given card may be dragged (RBAC). Defaults to always. */
  canDrag?: (task: Task) => boolean;
  /** multi-select mode: cards become checkboxes and drag is disabled. */
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
};

/** Kanban with HTML5 drag-and-drop between columns + click-to-open cards. */
export function KanbanBoard({
  columns,
  onCardClick,
  onDropTask,
  onAddInColumn,
  showAdd = true,
  canDrag,
  selectMode,
  selectedIds,
  onToggleSelect,
}: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const selecting = !!selectMode;

  return (
    <div className="grid flex-1 items-start gap-3.5 overflow-x-auto pb-2 [grid-template-columns:repeat(5,minmax(220px,1fr))]">
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
            // Fixed height: empty columns stay tall (easy drop target) and full
            // columns scroll their cards internally instead of growing the page.
            "flex h-[calc(100vh-15rem)] min-h-[320px] flex-col gap-2.5 rounded-xl bg-zinc-100 p-2.5 transition-colors",
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

          {/* Scrolls within the column; fills the height so empty columns are a
              full drop target. */}
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {col.cards.map((card) => {
            const draggable = (canDrag ? canDrag(card) : true) && !selecting;
            const selected = selectedIds?.has(card.id) ?? false;
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
              onClick={() =>
                selecting ? onToggleSelect?.(card.id) : onCardClick(card)
              }
              className={cn(
                "rounded-[10px] border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:border-zinc-300 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)]",
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                dragId === card.id && "opacity-50",
                selecting && selected && "border-teal-500 ring-2 ring-teal-500"
              )}
            >
              {selecting && (
                <div
                  className={cn(
                    "mb-2 flex size-4 items-center justify-center rounded border",
                    selected
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-zinc-300 bg-white"
                  )}
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </div>
              )}
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
                {card.assignees.length > 0 ? (
                  <div
                    className="flex -space-x-1.5"
                    title={card.assignees.map((a) => a.name).join(", ")}
                  >
                    {card.assignees.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full ring-2 ring-[color:var(--card)]"
                      >
                        <Avatar userKey={a.key} size={22} fontSize={9} />
                      </span>
                    ))}
                    {card.assignees.length > 3 && (
                      <span className="flex size-[22px] items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-[color:var(--card)]">
                        +{card.assignees.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <Avatar userKey="?" size={22} fontSize={9} />
                )}
                <StatusBadge
                  label={card.pri}
                  colors={PRIORITY_COLORS[card.pri]}
                  shape="tag"
                  className="text-[10.5px]"
                />
                {(card.description ||
                  card.linkCount > 0 ||
                  card.attachmentCount > 0 ||
                  card.checklistTotal > 0) && (
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
                    {card.checklistTotal > 0 && (
                      <span
                        className={`flex items-center gap-0.5 text-[10px] ${
                          card.checklistDone === card.checklistTotal
                            ? "text-teal-600"
                            : ""
                        }`}
                        title="รายการย่อยที่เสร็จ"
                      >
                        <CheckSquare className="size-3" />
                        {card.checklistDone}/{card.checklistTotal}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1" />
                {(() => {
                  // Flag overdue / due-soon dates so managers spot risk at a glance
                  // (done cards never look overdue).
                  const urgency =
                    card.status === "Done" ? null : dueUrgency(card.dueISO);
                  return (
                    <span
                      className={cn(
                        "text-[11px]",
                        urgency === "overdue"
                          ? "font-semibold text-red-600"
                          : urgency === "soon"
                            ? "font-medium text-amber-600"
                            : "text-zinc-400"
                      )}
                      title={
                        urgency === "overdue"
                          ? "เลยกำหนดแล้ว"
                          : urgency === "soon"
                            ? "ใกล้ครบกำหนด"
                            : undefined
                      }
                    >
                      {card.due}
                    </span>
                  );
                })()}
              </div>
            </div>
            );
          })}
          </div>
        </div>
      ))}
    </div>
  );
}
