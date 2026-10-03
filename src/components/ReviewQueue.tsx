"use client";

import { useEffect, useState } from "react";
import type { ReviewAction, ReviewItem, ReviewQueueState } from "@/lib/types";

// Dashboard surface for Human-in-the-Loop review: twin answers the hallucination
// cross-checker flagged (verified = 0) wait here for approve / edit / reject.
export default function ReviewQueue() {
  const [state, setState] = useState<ReviewQueueState | null>(null);
  const [error, setError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/review")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: ReviewQueueState) => !cancelled && setState(s))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
    setState((await res.json()) as ReviewQueueState);
  };

  const toggleHitl = (enabled: boolean) => {
    void post({ hitlEnabled: enabled }).catch(() => setError(true));
  };

  const act = (item: ReviewItem, action: ReviewAction, editedAnswer?: string) => {
    setBusyId(item.id);
    void post({ messageId: item.id, action, editedAnswer })
      .catch(() => setError(true))
      .finally(() => {
        setBusyId(null);
        setEditingId(null);
        setDraft("");
      });
  };

  const pending = state?.pendingCount ?? 0;

  return (
    <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-bold text-white">Human-in-the-Loop review</h2>
          {state && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                pending > 0
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {pending} pending
            </span>
          )}
        </div>
        <button
          role="switch"
          aria-checked={state?.hitlEnabled ?? true}
          onClick={() => state && toggleHitl(!state.hitlEnabled)}
          disabled={!state}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
            state?.hitlEnabled ? "bg-violet-600" : "bg-[#26263a]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              state?.hitlEnabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-1 text-sm text-[#9a9ab0]">
        When the twin&apos;s answer fails the hallucination cross-check, it lands here instead of
        being trusted blindly. Approve, correct, or reject each one.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-xs text-red-300">
          Could not reach the review API — your last action may not have saved. Reload to retry.
        </p>
      )}

      {!state ? (
        <p className="mt-4 animate-pulse text-xs text-[#5a5a72]">Loading review queue…</p>
      ) : !state.hitlEnabled ? (
        <p className="mt-4 rounded-xl bg-[#10101c] p-4 text-sm text-[#9a9ab0]">
          Review is paused — flagged answers fall back silently and are not surfaced.
          {pending > 0
            ? ` ${pending} item${pending > 1 ? "s" : ""} flagged while paused will appear when you switch it back on.`
            : ""}
        </p>
      ) : state.items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          All clear — no flagged responses.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {state.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-amber-500/25 bg-[#10101c] p-4">
              <div className="flex items-center justify-between gap-3 text-[11px] text-[#5a5a72]">
                <span>
                  Member <span className="font-semibold text-[#9a9ab0]">{item.memberId}</span>
                  {item.source && (
                    <>
                      {" · "}source: <span className="font-semibold text-[#9a9ab0]">{item.source}</span>
                    </>
                  )}
                </span>
                <span>{new Date(item.ts).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-[#c3c3d6]">
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-sky-300">Q</span>
                {item.question}
              </p>
              <p className="mt-2 rounded-lg bg-[#14141f] p-3 text-sm leading-relaxed text-[#c3c3d6]">
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                  Flagged answer
                </span>
                {item.answer}
              </p>

              {editingId === item.id ? (
                <div className="mt-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-violet-500/50 bg-[#0b0b14] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => act(item, "edit", draft)}
                      disabled={!draft.trim() || busyId === item.id}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
                    >
                      Save correction
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setDraft("");
                      }}
                      className="rounded-xl border border-[#26263a] px-4 py-2 text-sm text-[#9a9ab0] transition-colors hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => act(item, "approve")}
                    disabled={busyId === item.id}
                    className="rounded-xl border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setDraft(item.answer);
                    }}
                    disabled={busyId === item.id}
                    className="rounded-xl border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/10 disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => act(item, "reject")}
                    disabled={busyId === item.id}
                    className="rounded-xl border border-[#26263a] px-4 py-2 text-sm font-semibold text-[#9a9ab0] transition-colors hover:border-red-500/50 hover:text-red-300 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
