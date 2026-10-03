"use client";

import VoiceRecorder from "./VoiceRecorder";
import { useStore } from "@/lib/store";

// Portal card for Ghost Coaching memos delivered by the coach.
export default function GhostMemoCard() {
  const ghostMemos = useStore((s) => s.ghostMemos);
  const listenGhost = useStore((s) => s.listenGhost);
  const uploadGhostReply = useStore((s) => s.uploadGhostReply);

  const awaiting = ghostMemos.filter((m) => m.status === "awaiting_member");
  if (awaiting.length === 0) return null;

  return (
    <section className="space-y-3">
      {awaiting.map((m) => (
        <div
          key={m.id}
          className="rounded-2xl border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-950/40 to-[#14141f] p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              Ghost Coaching
            </div>
            {m.listened && (
              <span className="text-xs font-semibold text-emerald-300">Listened +30 XP ✓</span>
            )}
          </div>
          <h3 className="mt-2 font-bold text-white">Your coach left you a voice memo</h3>
          <p className="mt-1 text-xs text-[#9a9ab0]">Milestone: {m.milestone}</p>

          {m.coachMediaId && (
            <div className="mt-3">
              <audio src={`/api/media/${m.coachMediaId}`} controls className="h-10 w-full" />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!m.listened && (
              <button
                onClick={() => void listenGhost(m.id)}
                className="rounded-xl border border-fuchsia-500/50 px-4 py-2 text-sm font-semibold text-fuchsia-300 transition-colors hover:bg-fuchsia-500/10"
              >
                Mark as listened (+30 XP)
              </button>
            )}
          </div>

          <div className="mt-4 border-t border-[#26263a] pt-4">
            <div className="mb-2 text-xs font-semibold text-[#9a9ab0]">
              Reply to your coach (15s voice note)
            </div>
            <VoiceRecorder
              sendLabel="Send reply"
              onUpload={(blob, duration) => uploadGhostReply(m.id, blob, duration)}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
