"use client";

import VoiceRecorder from "@/components/VoiceRecorder";
import { useStore } from "@/lib/store";
import type { GhostStatus } from "@/lib/types";

const STATUS_STYLE: Record<GhostStatus, string> = {
  pending_coach: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  awaiting_member: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const STATUS_LABEL: Record<GhostStatus, string> = {
  pending_coach: "Needs your memo",
  awaiting_member: "Waiting for member",
  done: "Done",
};

export default function GhostInboxPage() {
  const ghostMemos = useStore((s) => s.ghostMemos);
  const notifications = useStore((s) => s.notifications);
  const uploadGhostMemo = useStore((s) => s.uploadGhostMemo);
  const followupGhost = useStore((s) => s.followupGhost);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Ghost Coaching</h1>
        <p className="mt-1 text-sm text-[#9a9ab0]">
          Member milestones arrive here with an AI summary. Record a 15-second voice memo — it
          lands on their dashboard; their voice reply comes back summarized.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {ghostMemos.length === 0 && (
            <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-8 text-center text-sm text-[#9a9ab0]">
              No memos yet. They appear when a member completes an issue or levels up.
            </div>
          )}
          {ghostMemos.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white">{m.milestone}</span>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[m.status]}`}
                >
                  {STATUS_LABEL[m.status]}
                </span>
              </div>
              <p className="mt-2 rounded-xl bg-[#10101c] p-3 text-sm leading-relaxed text-[#c3c3d6]">
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-fuchsia-300">
                  AI summary
                </span>
                {m.summary}
              </p>
              <div className="mt-1 text-[11px] text-[#5a5a72]">
                {new Date(m.createdAt).toLocaleString()}
                {m.followUpQueued && " · follow-up queued"}
              </div>

              {m.status === "pending_coach" && (
                <div className="mt-4">
                  <VoiceRecorder
                    sendLabel="Send to member"
                    onUpload={(blob, duration) => uploadGhostMemo(m.id, blob, duration)}
                  />
                </div>
              )}

              {m.status === "awaiting_member" && m.coachMediaId && (
                <div className="mt-4">
                  <div className="mb-1 text-xs text-[#9a9ab0]">
                    Your memo ({m.listened ? "listened ✓" : "not listened yet"})
                  </div>
                  <audio src={`/api/media/${m.coachMediaId}`} controls className="h-9 w-full" />
                </div>
              )}

              {m.status === "done" && (
                <div className="mt-4 space-y-3">
                  {m.replyMediaId && (
                    <div>
                      <div className="mb-1 text-xs text-[#9a9ab0]">Member&apos;s voice reply</div>
                      <audio src={`/api/media/${m.replyMediaId}`} controls className="h-9 w-full" />
                    </div>
                  )}
                  {m.replySummary && (
                    <p className="text-xs leading-relaxed text-[#9a9ab0]">{m.replySummary}</p>
                  )}
                  {!m.followUpQueued && (
                    <button
                      onClick={() => void followupGhost(m.id)}
                      className="rounded-xl border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
                    >
                      Queue follow-up
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
          <h2 className="text-sm font-bold text-white">Notification log</h2>
          <p className="mt-0.5 text-[11px] text-[#5a5a72]">
            WhatsApp / Telegram delivery is mocked — each send is logged here.
          </p>
          <div className="mt-3 space-y-2">
            {notifications.length === 0 && (
              <p className="text-xs text-[#5a5a72]">No notifications sent yet.</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl bg-[#10101c] p-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      n.channel === "whatsapp"
                        ? "border-emerald-500/40 text-emerald-300"
                        : "border-sky-500/40 text-sky-300"
                    }`}
                  >
                    {n.channel}
                  </span>
                  <span className="text-[10px] text-[#5a5a72]">
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#c3c3d6]">{n.text}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
