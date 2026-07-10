"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  FolderKanban,
  RefreshCw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageProjects, canDeleteProject } from "@/lib/permissions";
import { matchesSearch } from "@/lib/filters";
import type { ApiProject } from "@/lib/mappers";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "ใช้งาน",
  ON_HOLD: "พักไว้",
  COMPLETED: "เสร็จสิ้น",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#0d9488",
  ON_HOLD: "#d97706",
  COMPLETED: "#6366f1",
};

export default function ProjectsPage() {
  const me = useCurrentUser();
  const canManage = canManageProjects(me);
  const canDelete = canDeleteProject(me);
  const { refresh: refreshStore } = useData();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [archF, setArchF] = useState<"active" | "archived" | "all">("active");

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApiProject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    api
      .get<{ projects: ApiProject[] }>("/api/projects?includeArchived=1")
      .then((r) => setProjects(r.projects))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          matchesSearch([p.name, p.code, p.description], search) &&
          (statusF === "all" || p.status === statusF) &&
          (archF === "all" ||
            (archF === "archived" ? p.isArchived : !p.isArchived))
      ),
    [projects, search, statusF, archF]
  );

  const filtersActive = !!search || statusF !== "all" || archF !== "active";

  async function afterMutation() {
    load();
    await refreshStore(); // keep task/report project dropdowns fresh
  }

  async function doArchive(p: ApiProject, archive: boolean) {
    try {
      await api.patch(`/api/projects/${p.id}/${archive ? "archive" : "restore"}`);
      toast(archive ? `เก็บถาวร "${p.name}" แล้ว` : `กู้คืน "${p.name}" แล้ว`);
      afterMutation();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ดำเนินการไม่สำเร็จ");
    }
  }

  async function doDelete(p: ApiProject) {
    try {
      await api.del(`/api/projects/${p.id}`);
      toast(`ลบ "${p.name}" แล้ว`);
      afterMutation();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="PROJECTS"
        title="โปรเจกต์"
        description="จัดการโปรเจกต์ของทีม เก็บถาวรหรือกู้คืนได้"
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              เพิ่มโปรเจกต์
            </Button>
          ) : undefined
        }
      />

      <FilterBar trailing={`${filtered.length} โปรเจกต์`}>
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ / รหัส…" />
        <Select className="w-auto py-[7px] text-[12.5px]" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="all">สถานะทั้งหมด</option>
          <option value="ACTIVE">ใช้งาน</option>
          <option value="ON_HOLD">พักไว้</option>
          <option value="COMPLETED">เสร็จสิ้น</option>
        </Select>
        <Select className="w-auto py-[7px] text-[12.5px]" value={archF} onChange={(e) => setArchF(e.target.value as typeof archF)}>
          <option value="active">กำลังใช้งาน</option>
          <option value="archived">เก็บถาวร</option>
          <option value="all">ทั้งหมด</option>
        </Select>
        {filtersActive && (
          <button
            onClick={() => { setSearch(""); setStatusF("all"); setArchF("active"); }}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <X className="size-3" />
            ล้างตัวกรอง
          </button>
        )}
      </FilterBar>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12">
          <span className="text-[13px] text-red-800">โหลดโปรเจกต์ไม่สำเร็จ</span>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-100">
            <RefreshCw className="size-3.5" /> ลองใหม่
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title={projects.length === 0 ? "ยังไม่มีโปรเจกต์" : "ไม่พบโปรเจกต์"}
          description={projects.length === 0 ? "เพิ่มโปรเจกต์แรกของทีม" : "ลองปรับตัวกรอง"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className={`dp-card-hover flex flex-col rounded-xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
                p.isArchived ? "border-zinc-200 opacity-70" : "border-zinc-200"
              }`}
            >
              <div className="flex items-start gap-3 border-b border-hairline px-4 py-3">
                <span
                  className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-lg text-[12px] font-bold text-white"
                  style={{ background: p.color }}
                >
                  {p.code.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{p.name}</div>
                  <div className="font-mono text-[11px] text-zinc-400">{p.code}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      background: `${STATUS_COLOR[p.status ?? "ACTIVE"]}1a`,
                      color: STATUS_COLOR[p.status ?? "ACTIVE"],
                    }}
                  >
                    {STATUS_LABEL[p.status ?? "ACTIVE"] ?? p.status}
                  </span>
                  {p.isArchived && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      เก็บถาวร
                    </span>
                  )}
                </div>
              </div>

              {p.description && (
                <p className="border-b border-hairline-soft px-4 py-2.5 text-[12.5px] leading-relaxed text-zinc-600">
                  {p.description}
                </p>
              )}

              <div className="grid grid-cols-4 gap-1 px-4 py-3 text-center">
                <Stat label="งาน" value={p.stats?.totalTasks ?? 0} />
                <Stat label="เสร็จ" value={p.stats?.completedTasks ?? 0} />
                <Stat label="ค้าง" value={p.stats?.activeTasks ?? 0} />
                <Stat label="สมาชิก" value={p.stats?.members ?? 0} />
              </div>

              {canManage && (
                <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-hairline px-4 py-2.5">
                  {!p.isArchived && (
                    <button onClick={() => setEditing(p)} className="flex size-[28px] items-center justify-center rounded-[7px] border border-zinc-200 text-zinc-500 hover:bg-zinc-100" aria-label="แก้ไข">
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  {p.isArchived ? (
                    <button onClick={() => doArchive(p, false)} className="flex items-center gap-1.5 rounded-[7px] border border-teal-200 bg-teal-50 px-2.5 py-1 text-[12px] font-medium text-teal-700 hover:bg-teal-100">
                      <ArchiveRestore className="size-3.5" /> กู้คืน
                    </button>
                  ) : (
                    <button onClick={() => doArchive(p, true)} className="flex items-center gap-1.5 rounded-[7px] border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100">
                      <Archive className="size-3.5" /> เก็บถาวร
                    </button>
                  )}
                  {canDelete && p.isArchived && (
                    <button onClick={() => setPendingDelete(p)} className="flex size-[28px] items-center justify-center rounded-[7px] border border-zinc-200 text-red-600 hover:border-red-200 hover:bg-red-50" aria-label="ลบ">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Add */}
      <Dialog open={adding} onClose={() => setAdding(false)} title="เพิ่มโปรเจกต์">
        <ProjectForm
          onCancel={() => setAdding(false)}
          onSaved={() => { setAdding(false); afterMutation(); }}
        />
      </Dialog>

      {/* Edit */}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="แก้ไขโปรเจกต์" description={editing?.name}>
        {editing && (
          <ProjectForm
            project={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); afterMutation(); }}
          />
        )}
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && doDelete(pendingDelete)}
        title="ลบโปรเจกต์นี้?"
        message={`ลบ "${pendingDelete?.name}" ถาวร (ทำได้เฉพาะโปรเจกต์ที่ไม่มีงาน/รายงาน)`}
        confirmLabel="ลบโปรเจกต์"
        destructive
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[16px] font-bold tabular-nums">{value}</div>
      <div className="text-[10.5px] text-zinc-400">{label}</div>
    </div>
  );
}

function ProjectForm({
  project,
  onCancel,
  onSaved,
}: {
  project?: ApiProject;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [code, setCode] = useState(project?.code ?? "");
  const [color, setColor] = useState(project?.color ?? "#0d9488");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "ACTIVE");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !code.trim()) {
      setErr("กรุณากรอกชื่อและรหัสโปรเจกต์");
      return;
    }
    setSaving(true);
    setErr(null);
    const body = { name: name.trim(), code: code.trim().toUpperCase(), color, description: description.trim(), status };
    try {
      if (project) await api.patch(`/api/projects/${project.id}`, body);
      else await api.post("/api/projects", body);
      toast(project ? "บันทึกโปรเจกต์แล้ว" : "เพิ่มโปรเจกต์แล้ว");
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{err}</div>
      )}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="ชื่อโปรเจกต์">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น TRR OutDev" />
        </Field>
        <Field label="รหัส">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น TRR" maxLength={12} />
        </Field>
      </div>
      <Field label="รายละเอียด">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="อธิบายสั้น ๆ" />
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="สี">
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-9 cursor-pointer rounded border border-zinc-200" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
          </div>
        </Field>
        <Field label="สถานะ">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">ใช้งาน</option>
            <option value="ON_HOLD">พักไว้</option>
            <option value="COMPLETED">เสร็จสิ้น</option>
          </Select>
        </Field>
      </div>
      <FormActions>
        <button type="button" onClick={onCancel} className={buttonVariants({ variant: "secondary" })} disabled={saving}>
          ยกเลิก
        </button>
        <button type="button" onClick={submit} className={buttonVariants()} disabled={saving}>
          {saving ? "กำลังบันทึก…" : project ? "บันทึก" : "เพิ่มโปรเจกต์"}
        </button>
      </FormActions>
    </div>
  );
}
