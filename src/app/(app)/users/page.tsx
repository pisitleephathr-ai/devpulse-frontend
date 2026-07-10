"use client";

import { useState } from "react";
import { Plus, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { DataTable, DataTableRow } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { UserForm } from "@/components/forms/user-form";
import { toast } from "@/components/ui/toaster";
import { useData } from "@/lib/store";
import { ROLE_COLORS, type User } from "@/lib/mock-data";

const TEMPLATE = "190px minmax(200px,1fr) 130px 110px 170px";

export default function UsersPage() {
  const { users, addUser, updateUser, toggleUser } = useData();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <PageHeader
        eyebrow="USER MANAGEMENT"
        title="ผู้ใช้งาน"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-3.5" strokeWidth={2.4} />
            เพิ่มผู้ใช้
          </Button>
        }
      />

      <DataTable
        template={TEMPLATE}
        minWidth={880}
        headers={["ชื่อ", "อีเมล", "บทบาท", "สถานะ", ""]}
      >
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="size-5" />}
            title="ยังไม่มีผู้ใช้งาน"
            description="เพิ่มสมาชิกคนแรกเข้าทีม"
          />
        ) : (
          users.map((u) => {
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
              updateUser(editing.id, data);
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
