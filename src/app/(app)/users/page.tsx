"use client";

import { useMemo, useState } from "react";
import { Plus, Users as UsersIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { DataTable, DataTableRow } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { UserForm } from "@/components/forms/user-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import { ROLE_COLORS, type User } from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { canManageUsers } from "@/lib/permissions";
import { roleNameOf } from "@/lib/mappers";
import { matchesSearch } from "@/lib/filters";

const TEMPLATE = "190px minmax(200px,1fr) 130px 110px 170px";

export default function UsersPage() {
  const { users, roles, addUser, updateUser, toggleUser } = useData();
  const me = useCurrentUser();
  const canManage = canManageUsers(me);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [search, setSearch] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const filtersActive = !!search || roleF !== "all" || statusF !== "all";

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          matchesSearch([u.name, u.email], search) &&
          (roleF === "all" || u.roleCode === roleF) &&
          (statusF === "all" ||
            (statusF === "active" ? u.active : !u.active))
      ),
    [users, search, roleF, statusF]
  );

  function clearFilters() {
    setSearch("");
    setRoleF("all");
    setStatusF("all");
  }

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="USER MANAGEMENT"
        title="ผู้ใช้งาน"
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-3.5" strokeWidth={2.4} />
              เพิ่มผู้ใช้
            </Button>
          ) : undefined
        }
      />

      <FilterBar trailing={`${filtered.length} ผู้ใช้`}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ อีเมล…"
        />
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={roleF}
          onChange={(e) => setRoleF(e.target.value)}
        >
          <option value="all">บทบาททั้งหมด</option>
          {roles.map((r) => (
            <option key={r.id} value={r.code}>
              {roleNameOf(r)}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto py-[7px] text-[12.5px]"
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="active">ใช้งานอยู่</option>
          <option value="inactive">ปิดใช้งาน</option>
        </Select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <X className="size-3" />
            ล้างตัวกรอง
          </button>
        )}
      </FilterBar>

      <DataTable
        template={TEMPLATE}
        minWidth={880}
        headers={["ชื่อ", "อีเมล", "บทบาท", "สถานะ", ""]}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="size-5" />}
            title={users.length === 0 ? "ยังไม่มีผู้ใช้งาน" : "ไม่พบผู้ใช้"}
            description={
              users.length === 0 ? "เพิ่มสมาชิกคนแรกเข้าทีม" : "ลองปรับตัวกรอง"
            }
          />
        ) : (
          filtered.map((u) => {
            const opacity = u.active ? 1 : 0.45;
            return (
              <DataTableRow key={u.id}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    userKey={u.key}
                    size={26}
                    fontSize={10}
                    style={{ opacity }}
                  />
                  <span className="text-[13px] font-medium" style={{ opacity }}>
                    {u.name}
                  </span>
                </div>
                <span
                  className="font-mono text-[12.5px] text-zinc-500"
                  style={{ opacity }}
                >
                  {u.email}
                </span>
                <span className="justify-self-start" style={{ opacity }}>
                  <StatusBadge
                    label={u.role}
                    colors={ROLE_COLORS[u.role]}
                    shape="tag"
                  />
                </span>
                <span>
                  <StatusBadge label={u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"} />
                </span>
                <div className="flex justify-end gap-1.5">
                  {canManage ? (
                    <>
                      <button
                        onClick={() => setEditing(u)}
                        className="rounded-[7px] border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => {
                          toggleUser(u.id);
                          toast(
                            u.active
                              ? `ปิดใช้งาน ${u.name} แล้ว`
                              : `เปิดใช้งาน ${u.name} แล้ว`
                          );
                        }}
                        className="w-[92px] rounded-[7px] border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium transition-colors hover:bg-zinc-100"
                        style={{ color: u.active ? "#b91c1c" : "#15803d" }}
                      >
                        {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </>
                  ) : (
                    <span className="text-[11.5px] text-zinc-400">ดูอย่างเดียว</span>
                  )}
                </div>
              </DataTableRow>
            );
          })
        )}
      </DataTable>

      {/* Add */}
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="เพิ่มผู้ใช้"
        description="เชิญสมาชิกใหม่เข้าเวิร์กสเปซ"
      >
        <UserForm
          mode="create"
          onSubmit={(data) => {
            addUser(data);
            setAdding(false);
            toast("ส่งคำเชิญแล้ว");
          }}
          onCancel={() => setAdding(false)}
        />
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="แก้ไขผู้ใช้"
        description={editing?.name}
      >
        {editing && (
          <UserForm
            mode="edit"
            user={editing}
            onSubmit={(data) => {
              updateUser(editing.id, { name: data.name, roleId: data.roleId });
              setEditing(null);
              toast("บันทึกข้อมูลผู้ใช้แล้ว");
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
