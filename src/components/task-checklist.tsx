"use client";

import { useState } from "react";
import { CheckSquare, Square, Trash2, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import type { ApiChecklistItem } from "@/lib/mappers";

/**
 * Subtask / checklist editor shown in the task detail dialog. Self-contained:
 * manages its own items and talks to /api/tasks/:taskId/checklist.
 */
export function TaskChecklist({
  taskId,
  initialItems,
  canEdit,
}: {
  taskId: string;
  initialItems: ApiChecklistItem[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState<ApiChecklistItem[]>(initialItems);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  async function add() {
    const t = text.trim();
    if (!t || adding) return;
    setAdding(true);
    try {
      const { item } = await api.post<{ item: ApiChecklistItem }>(
        `/api/tasks/${taskId}/checklist`,
        { text: t }
      );
      setItems((prev) => [...prev, item]);
      setText("");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "เพิ่มรายการไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(item: ApiChecklistItem) {
    // Optimistic; reconcile on error.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
    );
    try {
      await api.patch(`/api/tasks/${taskId}/checklist/${item.id}`, {
        done: !item.done,
      });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i))
      );
      toast("อัปเดตไม่สำเร็จ");
    }
  }

  async function remove(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      await api.del(`/api/tasks/${taskId}/checklist/${id}`);
    } catch {
      setItems(prev);
      toast("ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-900">
        <CheckSquare className="size-3.5 text-zinc-400" />
        รายการย่อย
        {items.length > 0 && (
          <span className="text-zinc-400">
            ({done}/{items.length})
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canEdit && toggle(item)}
              disabled={!canEdit}
              className={`flex-none ${canEdit ? "cursor-pointer" : "cursor-default"} ${
                item.done ? "text-teal-600" : "text-zinc-400 hover:text-zinc-600"
              }`}
              aria-label={item.done ? "ทำเครื่องหมายยังไม่เสร็จ" : "ทำเครื่องหมายเสร็จ"}
            >
              {item.done ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4" />
              )}
            </button>
            <span
              className={`min-w-0 flex-1 text-[12.5px] ${
                item.done ? "text-zinc-400 line-through" : "text-zinc-700"
              }`}
            >
              {item.text}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="flex-none text-zinc-400 hover:text-red-600"
                aria-label="ลบรายการ"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-center text-[12px] text-zinc-400">
            ยังไม่มีรายการย่อย
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="เพิ่มรายการย่อย…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={add}
            disabled={!text.trim() || adding}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            เพิ่ม
          </button>
        </div>
      )}
    </div>
  );
}
