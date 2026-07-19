"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Send, Trophy, Trash2, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { useData } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { isManagerOrAdmin } from "@/lib/permissions";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { relativeTimeTh } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ApiUserMini = { id: string; name: string; avatarKey: string; roleRef?: { name: string } | null };
type Kudos = {
  id: string;
  message: string;
  category: string | null;
  createdAt: string;
  fromUser: ApiUserMini;
  toUser: ApiUserMini;
};
type KudosResp = {
  kudos: Kudos[];
  total: number;
  hasMore: boolean;
  leaderboard: { user: ApiUserMini; count: number }[];
};

/** UI-defined kudos categories (stored by key on the server). */
const CATEGORIES = [
  { key: "helpful", label: "ช่วยเหลือ", emoji: "🙌", color: "#0d9488" },
  { key: "fast", label: "ส่งมอบไว", emoji: "🚀", color: "#3b82f6" },
  { key: "quality", label: "คุณภาพเยี่ยม", emoji: "🏆", color: "#f59e0b" },
  { key: "idea", label: "ไอเดียเด็ด", emoji: "💡", color: "#8b5cf6" },
  { key: "teamwork", label: "ทีมเวิร์ก", emoji: "🤝", color: "#06b6d4" },
  { key: "dedication", label: "ทุ่มเท", emoji: "🔥", color: "#e11d48" },
] as const;
type Category = (typeof CATEGORIES)[number];
const CAT_BY_KEY = new Map<string, Category>(CATEGORIES.map((c) => [c.key, c]));

export default function KudosPage() {
  const me = useCurrentUser();
  const { users } = useData();
  const canModerate = isManagerOrAdmin(me);

  const [data, setData] = useState<KudosResp | null>(null);
  const [loading, setLoading] = useState(true);

  const [toId, setToId] = useState("");
  const [category, setCategory] = useState<string>("helpful");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const teammates = useMemo(
    () => users.filter((u) => u.key !== me?.avatarKey),
    [users, me]
  );

  function load() {
    api
      .get<KudosResp>("/api/kudos?limit=30")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load();
  }, []);

  async function send() {
    if (!toId || !message.trim() || sending) return;
    setSending(true);
    try {
      await api.post("/api/kudos", { toUserId: toId, message: message.trim(), category });
      setMessage("");
      setToId("");
      load();
      toast("ส่งคำชมแล้ว 🎉");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  async function remove(k: Kudos) {
    try {
      await api.del(`/api/kudos/${k.id}`);
      setData((d) => (d ? { ...d, kudos: d.kudos.filter((x) => x.id !== k.id) } : d));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const kudos = data?.kudos ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-7">
      <PageHeader
        eyebrow="KUDOS"
        title="ชื่นชมเพื่อนร่วมทีม"
        description="ส่งคำชมให้เพื่อนที่ช่วยเหลือหรือทำงานได้เยี่ยม 🎉"
      />

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-semibold">
          <Send className="size-4 text-teal-600" /> ส่งคำชม
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">ถึง</span>
            <Select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-auto min-w-[180px] py-[7px] text-[12.5px]"
            >
              <option value="">— เลือกเพื่อน —</option>
              {teammates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    active
                      ? "text-white"
                      : "border-border bg-card text-zinc-600 hover:bg-muted dark:text-zinc-300"
                  )}
                  style={active ? { background: c.color, borderColor: c.color } : undefined}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              rows={2}
              placeholder="เขียนคำชม เช่น ขอบคุณที่ช่วยแก้บั๊กด่วนเมื่อวาน…"
              className="min-w-0 flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none focus:border-teal-500"
            />
            <button
              onClick={send}
              disabled={!toId || !message.trim() || sending}
              className="flex flex-none items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
            >
              <Send className="size-4" /> {sending ? "กำลังส่ง…" : "ส่ง"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Wall */}
        <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
            ))
          ) : kudos.length === 0 ? (
            <EmptyState
              icon={<PartyPopper className="size-5" />}
              title="ยังไม่มีคำชม"
              description="เป็นคนแรกที่ชื่นชมเพื่อนร่วมทีม!"
            />
          ) : (
            kudos.map((k) => (
              <KudosCard
                key={k.id}
                k={k}
                canRemove={canModerate || k.fromUser.id === me?.id}
                onRemove={() => remove(k)}
              />
            ))
          )}
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-3 text-[13.5px] font-semibold">
            <Trophy className="size-4 text-amber-500" /> ได้รับชื่นชมมากสุด
            <span className="text-[11.5px] font-normal text-muted-foreground">(30 วัน)</span>
          </div>
          {(data?.leaderboard.length ?? 0) === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="flex flex-col divide-y divide-hairline-soft">
              {data!.leaderboard.map((row, i) => (
                <div key={row.user.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className={cn(
                      "flex size-6 flex-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                      i === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <Avatar userKey={row.user.avatarKey} size={28} fontSize={11} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{row.user.name}</span>
                  <span className="flex flex-none items-center gap-1 text-[12.5px] font-bold text-teal-600 dark:text-teal-400">
                    <Award className="size-3.5" />
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KudosCard({
  k,
  canRemove,
  onRemove,
}: {
  k: Kudos;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const cat = k.category ? CAT_BY_KEY.get(k.category) : null;
  const accent = cat?.color ?? "#0d9488";
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />
      <div className="flex items-center gap-2 pl-1">
        <Avatar userKey={k.fromUser.avatarKey} size={30} fontSize={12} />
        <span className="text-[13px] font-semibold">{k.fromUser.name}</span>
        <span className="text-[13px] text-muted-foreground">ชื่นชม</span>
        <Avatar userKey={k.toUser.avatarKey} size={30} fontSize={12} />
        <span className="text-[13px] font-semibold">{k.toUser.name}</span>
        {cat && (
          <span
            className="ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${cat.color}1f`, color: cat.color }}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{relativeTimeTh(k.createdAt)}</span>
          {canRemove && (
            <button
              onClick={onRemove}
              className="text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
              aria-label="ลบ"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line pl-1 text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-200 [overflow-wrap:anywhere]">
        {k.message}
      </p>
    </article>
  );
}
