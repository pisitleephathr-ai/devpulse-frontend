"use client";

import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import {
  MENU_DEFS,
  resolveMenu,
  MENU_UPDATED_EVENT,
  type MenuConfigItem,
} from "@/lib/menu";
import { defaultMenusForRole, ADMIN_LOCKED_MENUS } from "@/lib/permissions";
import type { ApiRole } from "@/lib/mappers";

/** Menu key → its current display label (custom name if set, else default). */
type MenuOption = { key: string; label: string };
const DEFAULT_MENU_OPTIONS: MenuOption[] = MENU_DEFS.map((m) => ({
  key: m.key,
  label: m.defaultLabel,
}));

const TEMPLATE = "minmax(160px,1fr) 130px 90px 110px 150px";

/** Capability grants a role can hold (mirrors the backend PERMISSIONS taxonomy). */
const PERMISSION_OPTIONS = [
  {
    value: "TASK_CREATE",
    label: "สร้างงานในบอร์ด",
    hint: "เพิ่ม/สร้างงานใหม่บนบอร์ดงานได้ (โดยไม่ต้องเป็นหัวหน้าทีม)",
  },
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

/** Personal-LINE notification types a role can be allowed to receive. */
const NOTIF_OPTIONS = [
  { value: "taskAssigned", label: "งานที่ได้รับมอบหมาย" },
  { value: "leaveDecision", label: "ผลอนุมัติการลา" },
  { value: "reportReminder", label: "เตือนส่งรายงานประจำวัน" },
] as const;
const ALL_NOTIF_KEYS = NOTIF_OPTIONS.map((n) => n.value);

export default function RolesPage() {
  const { roles, loading, addRole, updateRole, deleteRole } = useData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApiRole | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiRole | null>(null);
  const [search, setSearch] = useState("");

  // Menu options shown in the role editor, resolved through the saved menu
  // config so renamed menus display their custom label (not the code default).
  const [menuOptions, setMenuOptions] =
    useState<MenuOption[]>(DEFAULT_MENU_OPTIONS);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get<{ menu: MenuConfigItem[] }>("/api/settings/menu")
        .then(
          (r) =>
            active &&
            setMenuOptions(
              resolveMenu(r.menu).map((m) => ({ key: m.key, label: m.label }))
            )
        )
        .catch(() => active && setMenuOptions(DEFAULT_MENU_OPTIONS));
    load();
    // Refresh live when the settings page saves a new menu config.
    window.addEventListener(MENU_UPDATED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(MENU_UPDATED_EVENT, load);
    };
  }, []);

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
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium">{r.name}</span>
                  {r.assignable === false && (
                    <span className="flex-none rounded bg-zinc-100 px-1.5 py-px text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      ไม่อยู่ในบอร์ด
                    </span>
                  )}
                </div>
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
          menuOptions={menuOptions}
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
            menuOptions={menuOptions}
            onSubmit={async (data) => {
              const ok = await updateRole(editing.id, {
                name: data.name,
                description: data.description,
                // "Appears on board" is a team-membership flag, editable for
                // every role — including system roles.
                assignable: data.assignable,
                // Menu visibility is navigation-only — editable for every role.
                menuAccess: data.menuAccess,
                // Personal-LINE notification allow-list (editable for every role).
                lineNotifications: data.lineNotifications,
                // Capabilities are editable for every role except ADMIN, whose
                // full access is fixed (the backend enforces the same rule).
                ...(editing.code === "ADMIN" ? {} : { permissions: data.permissions }),
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
  menuOptions,
  onSubmit,
  onCancel,
}: {
  role?: ApiRole;
  menuOptions: MenuOption[];
  onSubmit: (data: {
    name: string;
    code: string;
    description: string;
    permissions: string[];
    assignable: boolean;
    menuAccess: string[];
    lineNotifications: string[];
  }) => void | Promise<boolean | void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [code, setCode] = useState(role?.code ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [assignable, setAssignable] = useState(role?.assignable !== false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!role;
  // Only the ADMIN role's capabilities are locked (it must stay full to prevent
  // self-lockout). Every other role — including built-in worker roles — can be
  // granted/removed fine-grained capabilities.
  const canEditPerms = role?.code !== "ADMIN";

  // Admin roles keep the role/settings menus locked on (no self-lockout).
  const isAdminRole =
    role?.code === "ADMIN" || (role?.permissions ?? []).includes("ADMIN_FULL");
  // Seed the menu checklist from the saved list, or the role's built-in
  // defaults when it has never been configured.
  const [menus, setMenus] = useState<Set<string>>(() =>
    new Set(
      role?.menuAccess && role.menuAccess.length > 0
        ? role.menuAccess
        : defaultMenusForRole(role?.code ?? "")
    )
  );
  // Empty saved list = all types allowed (default) → seed all checked.
  const [notifs, setNotifs] = useState<Set<string>>(() =>
    new Set(
      role?.lineNotifications && role.lineNotifications.length > 0
        ? role.lineNotifications
        : ALL_NOTIF_KEYS
    )
  );

  const togglePerm = (p: string) =>
    setPermissions((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
  const toggleNotif = (k: string) =>
    setNotifs((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const toggleMenu = (k: string) =>
    setMenus((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  function submit() {
    if (!name.trim()) return setError("กรุณากรอกชื่อบทบาท");
    if (!isEdit && !/^[A-Za-z0-9_-]{2,24}$/.test(code.trim()))
      return setError("รหัสต้องเป็นตัวอักษร/ตัวเลข/ขีด 2–24 ตัว");
    // Admin roles always retain the locked menus regardless of the checkboxes.
    const menuAccess = [...menus];
    if (isAdminRole) {
      for (const m of ADMIN_LOCKED_MENUS)
        if (!menuAccess.includes(m)) menuAccess.push(m);
    }
    // All types selected ≡ the "all allowed" default → store as [] (canonical).
    const lineNotifications =
      notifs.size === ALL_NOTIF_KEYS.length ? [] : [...notifs];
    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      permissions,
      assignable,
      menuAccess,
      lineNotifications,
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
      <Field label="สิทธิ์การเข้าถึง" hint={canEditPerms ? "ไม่บังคับ" : "บทบาทผู้ดูแลระบบ — สิทธิ์เต็มเสมอ"}>
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
      <Field label="การแสดงในบอร์ดงาน">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2 hover:bg-muted/50">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-teal-600"
            checked={assignable}
            onChange={(e) => setAssignable(e.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">
              แสดงในบอร์ดงาน / มอบหมายงานได้
            </span>
            <span className="block text-[11.5px] text-muted-foreground">
              ถ้าปิด ผู้ใช้บทบาทนี้จะไม่ถูกมอบหมายงาน และไม่แสดงในภาระงานของทีมบนแดชบอร์ด (เหมาะกับผู้ดูแลระบบ)
            </span>
          </span>
        </label>
      </Field>
      <Field
        label="เมนูที่มองเห็น"
        hint="เลือกเมนูที่บทบาทนี้เห็นในแถบด้านซ้าย"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {menuOptions.map((m) => {
            const locked = isAdminRole && ADMIN_LOCKED_MENUS.includes(m.key);
            const checked = locked || menus.has(m.key);
            return (
              <label
                key={m.key}
                className={`flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 ${
                  locked ? "opacity-60" : "cursor-pointer hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-teal-600"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleMenu(m.key)}
                />
                <span className="text-[13px] font-medium">{m.label}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">
          เป็นการซ่อน/แสดงเมนูเท่านั้น สิทธิ์การใช้งาน API ยังคุมด้วยสิทธิ์ของบทบาทตามเดิม
        </p>
      </Field>
      <Field
        label="แจ้งเตือน LINE ส่วนตัว (ที่อนุญาต)"
        hint="เลือกว่าบทบาทนี้รับแจ้งเตือนส่วนตัวแบบไหนได้ — ผู้ใช้เปิด/ปิดเองได้ภายในที่อนุญาต"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {NOTIF_OPTIONS.map((n) => (
            <label
              key={n.value}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                className="size-4 accent-teal-600"
                checked={notifs.has(n.value)}
                onChange={() => toggleNotif(n.value)}
              />
              <span className="text-[13px] font-medium">{n.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">
          ไม่เลือกเลย = อนุญาตทุกแบบ (ค่าเริ่มต้น) · ต้องการจำกัด ให้เลือกเฉพาะที่อนุญาต
        </p>
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
