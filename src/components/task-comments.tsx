"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { relativeTimeTh } from "@/lib/utils";

type ApiComment = {
  id: string;
  message: string;
  isEdited: boolean;
  createdAt: string;
  author: { id: string; name: string; avatarKey: string };
};

export function TaskComments({ taskId }: { taskId: string }) {
  const me = useCurrentUser();
  const canModerate = isManagerOrAdmin(me);

  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get<{ comments: ApiComment[] }>(`/api/tasks/${taskId}/comments`)
      .then((r) => mounted.current && setComments(r.comments))
      .catch(() => {})
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [taskId]);

  async function add() {
    const msg = text.trim();
    if (!msg || submitting) return;
    setSubmitting(true);
    try {
      const { comment } = await api.post<{ comment: ApiComment }>(
        `/api/tasks/${taskId}/comments`,
        { message: msg }
      );
      setComments((c) => [...c, comment]);
      setText("");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ส่งความคิดเห็นไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    const msg = editText.trim();
    if (!msg) return;
    try {
      const { comment } = await api.patch<{ comment: ApiComment }>(
        `/api/tasks/${taskId}/comments/${id}`,
        { message: msg }
      );
      setComments((c) => c.map((x) => (x.id === id ? comment : x)));
      setEditingId(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "แก้ไขไม่สำเร็จ");
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/api/tasks/${taskId}/comments/${id}`);
      setComments((c) => c.filter((x) => x.id !== id));
      toast("ลบความคิดเห็นแล้ว");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-900">
        <MessageSquare className="size-3.5 text-zinc-400" />
        ความคิดเห็น
        {comments.length > 0 && (
          <span className="text-zinc-400">({comments.length})</span>
        )}
      </div>

      {/* List */}
      <div className="mb-3 flex flex-col gap-2.5">
        {loading ? (
          <div className="text-[12px] text-zinc-400">กำลังโหลด…</div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-[12px] text-zinc-400">
            ยังไม่มีความคิดเห็น
          </div>
        ) : (
          comments.map((c) => {
            const own = !!me && c.author.id === me.id;
            const editing = editingId === c.id;
            return (
              <div key={c.id} className="flex gap-2">
                <Avatar userKey={c.author.avatarKey} size={26} fontSize={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold">{c.author.name}</span>
                    <span className="text-[11px] text-zinc-400">
                      {relativeTimeTh(c.createdAt)}
                      {c.isEdited ? " · แก้ไขแล้ว" : ""}
                    </span>
                    {(own || canModerate) && !editing && (
                      <span className="ml-auto flex gap-1">
                        {own && (
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setEditText(c.message);
                            }}
                            className="text-zinc-400 hover:text-zinc-700"
                            aria-label="แก้ไขความคิดเห็น"
                          >
                            <Pencil className="size-3" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(c.id)}
                          className="text-zinc-400 hover:text-red-600"
                          aria-label="ลบความคิดเห็น"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  {editing ? (
                    <div className="mt-1 flex items-start gap-1.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="flex size-6 items-center justify-center rounded-md bg-teal-600 text-white hover:bg-teal-700"
                        aria-label="บันทึก"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex size-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                        aria-label="ยกเลิก"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-700">
                      {c.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          rows={2}
          placeholder="เขียนความคิดเห็น..."
          className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-[12.5px] outline-none focus:border-teal-500"
        />
        <button
          onClick={add}
          disabled={!text.trim() || submitting}
          className="rounded-lg bg-teal-600 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "กำลังส่ง…" : "เพิ่มความคิดเห็น"}
        </button>
      </div>
    </div>
  );
}
