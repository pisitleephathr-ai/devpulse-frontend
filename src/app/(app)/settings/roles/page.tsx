"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormActions } from "@/components/form-card";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { DataTable, DataTableRow } from "@/components/data-table";
import { TableRowsSkeleton } from "@/components/skeletons";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import { matchesSearch } from "@/lib/filters";
import type { ApiRole } from "@/lib/mappers";

const TEMPLATE = "minmax(160px,1fr) 130px 90px 110px 150px";

/** Capability grants a role can hold (mirrors the backend PERMISSIONS taxonomy). */
const PERMISSION_OPTIONS = [
  {
    value: "TEAM_MANAGE",
    label: "จัดการทีม",
    hint: "โปรเจกต์ · อนุมัติการลา · แก้ไขงาน/รายงานของทีม",
  },
  {
    value: "ADMIN_FULL",
    label: "ผู้ดูแลระบบเต็ม",
    hint: "ผู้ใช้ · บทบาท · ตั้งค่า · การลบ",
  },
] as const;

const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_OPTIONS.map((p) => [p.value, p.label])
);

export default function RolesPage() {
  const { roles, loading, addRole, updateRole, deleteRole } = useData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApiRole | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiRole | null>(null);
  const [search, setSearch] = useState("");

  const filtered = roles.filter((r) => matchesSearch([r.name, r.code], search));

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="ROLE MANAGEMENT"
        title="บทบาท"
        description="สร้างและจัดการบทบาทของทีม เพิ่มบทบาทใหม่ได้โดยไม่ต้องแก้โค้ด"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            เพิ่มบทบาท
          </Button>
        }
      />

      <FilterBar trailing={`${filtered.length} บทบาท`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาบทบาท / รหัส…"
        />
      </FilterBar>

      {loading && roles.length === 0 ? (
        <TableRowsSkeleton rows={5} />
      ) : (
      <DataTable
        template={TEMPLATE}
        minWidth={720}
        headers={["บทบาท", "รหัส", "ผู้ใช้", "สถานะ", ""]}
      >
        {filtered.length === 0 && (
          <div className="px-[22px] py-6 text-center text-[12.5px] text-zinc-400">
            ไม่พบบทบาท
          </div>
        )}
        {filtered.map((r) => (
          <DataTableRow key={r.id}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-7 flex-none items-center justify-center rounded-md bg-teal-50 text-teal-600">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{r.name}</div>
                {r.isSystem ? (
                  <div className="text-[11px] text-zinc-400">บทบาทระบบ</div>
                ) : r.permissions && r.permissions.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {r.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-teal-50 px-1.5 py-px text-[10px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      >
                        {PERMISSION_LABEL[p] ?? p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-400">ไม่มีสิทธิ์พิเศษ</div>
                )}
              </div>
            </div>
            <span className="font-mono text-[12px] text-zinc-500">{r.code}</span>
            <span className="text-[12.5px] text-zinc-500">
              {r._count?.users ?? 0}
            </span>
            <span>
              <StatusBadge
                label={r.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                colors={r.isActive ? ["#dcfce7", "#15803d"] : ["#f4f4f5", "#71717a"]}
              />
            </span>
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setEditing(r)}
                className="flex size-[26px] items-center justify-center rounded-[7px] border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100"
                aria-label="แก้ไข"
              >
                <Pencil className="size-3.5" />
              </button>
              {!r.isSystem && (
                <button
                  onClick={() => {
                    updateRole(r.id, { isActive: !r.isActive });
                    toast(r.isActive ? "ปิดใช้งานบทบาทแล้ว" : "เปิดใช้งานบทบาทแล้ว");
                  }}
                  className="rounded-[7px] border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium transition-colors hover:bg-zinc-100"
                  style={{ color: r.isActive ? "#b91c1c" : "#15803d" }}
                >
                  {r.isActive ? "ปิด" : "เปิด"}
                </button>
              )}
              {!r.isSystem && (
                <button
                  onClick={() => setPendingDelete(r)}
                  className="flex size-[26px] items-center justify-center rounded-[7px] border border-zinc-200 text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                  aria-label="ลบ"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </DataTableRow>
        ))}
      </DataTable>
      )}

      {/* Add */}
      <Dialog open={adding} onClose={() => setAdding(false)} title="เพิ่มบทบาทใหม่">
        <RoleForm
          onSubmit={async (data) => {
            const ok = await addRole(data);
            if (ok) {
              setAdding(false);
              toast("เพิ่มบทบาทแล้ว");
            }
            return ok;
          }}
          onCancel={() => setAdding(false)}
        />
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="แก้ไขบทบาท"
        description={editing?.code}
      >
        {editing && (
          <RoleForm
            role={editing}
            onSubmit={async (data) => {
              const ok = await updateRole(editing.id, {
                name: data.name,
                description: data.description,
                // System-role permissions are fixed (backend rejects edits).
                ...(editing.isSystem ? {} : { permissions: data.permissions }),
              });
              if (ok) {
                setEditing(null);
                toast("บันทึกบทบาทแล้ว");
              }
              return ok;
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete && (await deleteRole(pendingDelete.id))) {
            toast("ลบบทบาทแล้ว");
          }
        }}
        title="ลบบทบาทนี้?"
        message={`ต้องการลบบทบาท "${pendingDelete?.name}" ใช่หรือไม่ (ต้องไม่มีผู้ใช้ในบทบาทนี้)`}
        confirmLabel="ลบบทบาท"
        destructive
      />
    </div>
  );
}

function RoleForm({
  role,
  onSubmit,
  onCancel,
}: {
  role?: ApiRole;
  onSubmit: (data: {
    name: string;
    code: string;
    description: string;
    permissions: string[];
  }) => void | Promise<boolean | void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [code, setCode] = useState(role?.code ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!role;
  // System roles have fixed capabilities — the backend rejects permission edits.
  const canEditPerms = !role?.isSystem;

  const togglePerm = (p: string) =>
    setPermissions((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );

  function submit() {
    if (!name.trim()) return setError("กรุณากรอกชื่อบทบาท");
    if (!isEdit && !/^[A-Za-z0-9_-]{2,24}$/.test(code.trim()))
      return setError("รหัสต้องเป็นตัวอักษร/ตัวเลข/ขีด 2–24 ตัว");
    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      permissions,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <Field label="ชื่อบทบาท">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Designer, PM, BA" />
      </Field>
      <Field label="รหัส (code)" hint={isEdit ? "แก้ไขไม่ได้" : "เช่น DESIGNER, PM"}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isEdit}
          placeholder="DESIGNER"
          className={`font-mono ${isEdit ? "bg-zinc-100 text-zinc-500" : ""}`}
        />
      </Field>
      <Field label="คำอธิบาย" hint="ไม่บังคับ">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="สิทธิ์การเข้าถึง" hint={canEditPerms ? "ไม่บังคับ" : "บทบาทระบบ — แก้ไขไม่ได้"}>
        <div className="flex flex-col gap-1.5">
          {PERMISSION_OPTIONS.map((p) => (
            <label
              key={p.value}
              className={`flex items-start gap-2.5 rounded-lg border border-border px-3 py-2 ${
                canEditPerms ? "cursor-pointer hover:bg-muted/50" : "opacity-60"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-teal-600"
                checked={permissions.includes(p.value)}
                disabled={!canEditPerms}
                onChange={() => togglePerm(p.value)}
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">{p.label}</span>
                <span className="block text-[11.5px] text-muted-foreground">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>
      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="button" onClick={submit}>
          {isEdit ? "บันทึก" : "เพิ่มบทบาท"}
        </Button>
      </FormActions>
    </div>
  );
}
