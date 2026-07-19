"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Link2, GripVertical, ArrowDownUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FormActions } from "@/components/form-card";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { bangkokDateISO } from "@/lib/thai-datetime";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import {
  REPORT_STATUS_ENUM_OPTIONS,
  TH_TO_REPORT_STATUS,
  type ApiReport,
  type ReportInput,
  type ReportStatusEnum,
} from "@/lib/mappers";
import type { Report, Task } from "@/lib/mock-data";

type Section = "DID" | "PLAN";

/** One editable report row. `key` is a stable React list id. */
type ItemState = {
  key: string;
  section: Section;
  title: string;
  taskId: string | null;
  progress: number;
  note: string;
};

let keySeq = 0;
const nextKey = () => `item-${keySeq++}`;
const blankItem = (section: Section): ItemState => ({
  key: nextKey(),
  section,
  title: "",
  taskId: null,
  progress: 0,
  note: "",
});

type ReportFormProps = {
  mode: "create" | "edit";
  report?: Report;
  onSubmit: (data: ReportInput) => void | Promise<boolean | void>;
  onCancel: () => void;
};

export function ReportForm({ mode, report, onSubmit, onCancel }: ReportFormProps) {
  const { projects, tasks } = useData();
  const me = useCurrentUser();

  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<ReportStatusEnum>(
    report ? TH_TO_REPORT_STATUS[report.status] ?? "SUBMITTED" : "SUBMITTED"
  );
  const [items, setItems] = useState<ItemState[]>(() => {
    const src = report?.items ?? [];
    if (src.length)
      return src.map((it) => ({
        key: it.id || nextKey(),
        section: it.section === "PLAN" ? "PLAN" : "DID",
        title: it.title,
        taskId: it.task?.id ?? null,
        progress: it.progress,
        note: it.note,
      }));
    return [blankItem("DID")];
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "create") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate((d) => d || bangkokDateISO());
  }, [mode]);

  useEffect(() => {
    if (projectId || projects.length === 0) return;
    const initial =
      (report && projects.find((p) => p.name === report.proj)?.id) || projects[0].id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectId(initial);
  }, [projects, report, projectId]);

  const mineIds = useMemo(() => {
    const id = me?.id;
    if (!id) return new Set<string>();
    return new Set(
      tasks.filter((t) => t.assignees.some((a) => a.id === id)).map((t) => t.id)
    );
  }, [tasks, me?.id]);

  const setItem = (key: string, patch: Partial<ItemState>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = (section: Section) =>
    setItems((prev) => [...prev, blankItem(section)]);
  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((it) => it.key !== key));
  const moveItem = (key: string, section: Section) => setItem(key, { section });

  /** Pull unfinished (<100%) items from my latest report into "งานที่ทำล่าสุด". */
  async function pullFromLatest() {
    if (!me?.id) return;
    setPulling(true);
    try {
      const { reports } = await api.get<{ reports: ApiReport[] }>(
        `/api/reports?authorId=${me.id}&limit=1&page=1`
      );
      const latest = reports?.[0];
      const carry = (latest?.items ?? []).filter((it) => it.progress < 100);
      if (!carry.length) {
        toast("ไม่มีงานค้างจากรายงานล่าสุด");
        return;
      }
      setItems((prev) => {
        const existing = new Set(prev.map((p) => p.title.trim()));
        const added = carry
          .filter((it) => !existing.has(it.title.trim()))
          .map((it) => ({
            key: nextKey(),
            section: "DID" as Section,
            title: it.title,
            taskId: it.taskId ?? null,
            progress: it.progress,
            note: "",
          }));
        return added.length ? [...prev, ...added] : prev;
      });
      toast(`ดึงงานค้าง ${carry.length} รายการมาแล้ว`);
    } catch {
      toast("ดึงรายงานล่าสุดไม่สำเร็จ");
    } finally {
      setPulling(false);
    }
  }

  function submit(nextStatus: ReportStatusEnum) {
    const filled = items.filter((it) => it.title.trim());
    if (!projectId) return setError("กรุณาเลือกโปรเจกต์");
    if (!filled.length) return setError("กรุณาเพิ่มงานอย่างน้อย 1 รายการ");
    setError(null);
    setSubmitting(true);
    const mk = (it: ItemState) => ({
      section: it.section,
      taskId: it.taskId,
      title: it.title.trim(),
      progress: it.progress,
      note: it.note.trim(),
    });
    const did = filled.filter((it) => it.section === "DID");
    const plan = filled.filter((it) => it.section === "PLAN");
    const data: ReportInput = {
      projectId,
      status: nextStatus,
      items: filled.map(mk),
      // Derived text for backward-compat with a not-yet-updated backend.
      did: did.map((it) => `${it.title.trim()} — ${it.progress}%`).join("\n"),
      plan: plan.map((it) => `${it.title.trim()} (${it.progress}%)`).join("\n"),
      blockers: filled
        .filter((it) => it.note.trim())
        .map((it) => `${it.title.trim()}: ${it.note.trim()}`)
        .join("\n"),
    };
    if (mode === "create") data.date = date;
    setTimeout(async () => {
      const ok = await onSubmit(data);
      if (ok === false) setSubmitting(false);
    }, 200);
  }

  const didItems = items.filter((it) => it.section === "DID");
  const planItems = items.filter((it) => it.section === "PLAN");

  const renderSection = (section: Section, title: string, accent: string, list: ItemState[]) => (
    <div
      className="flex flex-col gap-2 rounded-xl border border-hairline p-3"
      onDragOver={(e) => {
        if (dragKey) e.preventDefault();
      }}
      onDrop={() => {
        if (dragKey) moveItem(dragKey, section);
        setDragKey(null);
      }}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: accent }} />
        <div className="text-[13px] font-semibold">{title}</div>
        <span className="text-[11.5px] text-muted-foreground">({list.length})</span>
      </div>
      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-[11.5px] text-muted-foreground">
          ลากงานมาที่นี่ หรือกด “เพิ่มงาน”
        </p>
      )}
      {list.map((it) => (
        <ItemRow
          key={it.key}
          item={it}
          tasks={tasks}
          mineIds={mineIds}
          onChange={(patch) => setItem(it.key, patch)}
          onRemove={() => removeItem(it.key)}
          onMove={() => moveItem(it.key, section === "DID" ? "PLAN" : "DID")}
          onDragStart={() => setDragKey(it.key)}
          onDragEnd={() => setDragKey(null)}
        />
      ))}
      <button
        type="button"
        onClick={() => addItem(section)}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-medium text-teal-600 transition-colors hover:bg-teal-50 dark:hover:bg-teal-950/30"
      >
        <Plus className="size-3.5" /> เพิ่มงาน
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {mode === "create" && (
          <Field label="วันที่รายงาน">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <Field label="โปรเจกต์">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {mode === "edit" && (
          <Field label="สถานะ">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ReportStatusEnum)}>
              {REPORT_STATUS_ENUM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {mode === "create" && (
        <button
          type="button"
          onClick={pullFromLatest}
          disabled={pulling}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-muted disabled:opacity-50 dark:text-zinc-300"
        >
          <History className="size-3.5" /> {pulling ? "กำลังดึง…" : "ดึงงานค้างจากรายงานล่าสุด"}
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderSection("DID", "งานที่ทำล่าสุด", "#0d9488", didItems)}
        {renderSection("PLAN", "แผนงานวันนี้", "#2563eb", planItems)}
      </div>

      <FormActions>
        {mode === "create" ? (
          <>
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => submit("DRAFT")}>
              บันทึกฉบับร่าง
            </Button>
            <Button type="button" disabled={submitting} onClick={() => submit("SUBMITTED")}>
              {submitting ? "กำลังส่ง…" : "ส่งรายงาน"}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="button" disabled={submitting} onClick={() => submit(status)}>
              {submitting ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </>
        )}
      </FormActions>
    </div>
  );
}

const PROGRESS_COLOR = (p: number) =>
  p >= 100 ? "text-emerald-600" : p >= 50 ? "text-teal-600" : "text-amber-600";

function ItemRow({
  item,
  tasks,
  mineIds,
  onChange,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  item: ItemState;
  tasks: Task[];
  mineIds: Set<string>;
  onChange: (patch: Partial<ItemState>) => void;
  onRemove: () => void;
  onMove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = item.title.trim().toLowerCase();
    const pool = tasks.filter((t) => (q ? true : mineIds.has(t.id)));
    const matched = q
      ? pool.filter((t) => t.title.toLowerCase().includes(q) || t.proj.toLowerCase().includes(q))
      : pool;
    return matched
      .sort((a, b) => Number(mineIds.has(b.id)) - Number(mineIds.has(a.id)))
      .slice(0, 6);
  }, [tasks, item.title, mineIds]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="rounded-xl border border-hairline bg-muted/20 p-2.5"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-2 size-4 flex-none cursor-grab text-zinc-300 dark:text-zinc-600" />
        <div className="min-w-0 flex-1">
          <div className="relative">
            <Input
              value={item.title}
              placeholder="พิมพ์ หรือเลือกงานจากบอร์ด"
              onChange={(e) => {
                onChange({ title: e.target.value, taskId: null });
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                {suggestions.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ title: t.title, taskId: t.id });
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 border-b border-hairline px-2.5 py-2 text-left text-[12.5px] transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <Link2 className="size-3.5 flex-none text-teal-600" />
                    <span className="flex-none font-mono text-[10px] font-semibold" style={{ color: t.projFg }}>
                      {t.proj}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    {mineIds.has(t.id) && (
                      <span className="flex-none rounded bg-teal-50 px-1.5 py-px text-[10px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                        ของฉัน
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onMove}
          title={item.section === "DID" ? "ย้ายไปแผนงานวันนี้" : "ย้ายไปงานที่ทำล่าสุด"}
          className="mt-1.5 flex-none text-zinc-400 transition-colors hover:text-teal-600"
          aria-label="ย้ายส่วน"
        >
          <ArrowDownUp className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1.5 flex-none text-zinc-400 transition-colors hover:text-red-600"
          aria-label="ลบงานนี้"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3 pl-6">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={item.progress}
          onChange={(e) => onChange({ progress: Number(e.target.value) })}
          className="h-1.5 flex-1 cursor-pointer accent-teal-600"
          aria-label="ความคืบหน้า"
        />
        <span className={`w-11 flex-none text-right text-[13px] font-bold tabular-nums ${PROGRESS_COLOR(item.progress)}`}>
          {item.progress}%
        </span>
      </div>
      <div className="mt-2 pl-6">
        <Input
          value={item.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="โน้ต / ติดปัญหา (ไม่บังคับ)"
          className="text-[12.5px]"
        />
      </div>
    </div>
  );
}
