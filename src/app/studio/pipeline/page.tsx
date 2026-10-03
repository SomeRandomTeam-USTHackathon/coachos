"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SAMPLE_TRANSCRIPT } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { StructureDraft } from "@/server/structure";
import type { Access } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

type Step = "input" | "command" | "processing" | "draft" | "done";

const PROCESS_STEPS = [
  "Cleaning media — removing filler words and noise",
  "Transcribing speech to text",
  "Structuring into title, key points and chapters",
];

const COMMAND_CHIPS = [
  "Clean and transcribe, extract 5 key points",
  "Turn this into a member issue, keep it punchy",
  "Structure as a Season episode with a summary",
];

interface Draft extends StructureDraft {
  seasonId: string; // existing season id, "current", or "new"
  newSeasonTitle: string;
  access: Access;
}

export default function PipelinePage() {
  const seasons = useStore((s) => s.seasons);
  const publishIssue = useStore((s) => s.publishIssue);

  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [command, setCommand] = useState(COMMAND_CHIPS[0]);
  const [procStep, setProcStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (step !== "processing") return;
    let cancelled = false;
    const timers = PROCESS_STEPS.map((_, i) =>
      setTimeout(() => !cancelled && setProcStep(i + 1), (i + 1) * 1100)
    );
    const minDelay = new Promise((r) => setTimeout(r, PROCESS_STEPS.length * 1100 + 500));
    const request = api<StructureDraft>("/api/pipeline/structure", { rawText }).catch(() => null);
    void Promise.all([request, minDelay]).then(([result]) => {
      if (cancelled) return;
      if (!result) {
        setStep("command");
        return;
      }
      setDraft({ ...result, seasonId: "current", newSeasonTitle: "", access: "free" });
      setStep("draft");
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const publish = async () => {
    if (!draft || publishing) return;
    setPublishing(true);
    try {
      await publishIssue({
        seasonId: draft.seasonId,
        newSeasonTitle: draft.seasonId === "new" ? draft.newSeasonTitle : undefined,
        title: draft.title,
        summary: draft.summary,
        keyPoints: draft.keyPoints,
        body: draft.body,
        access: draft.access,
        readMinutes: draft.readMinutes,
      });
      setStep("done");
    } finally {
      setPublishing(false);
    }
  };

  const updateKp = (idx: number, value: string) =>
    setDraft((d) => d && { ...d, keyPoints: d.keyPoints.map((k, i) => (i === idx ? value : k)) });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black text-white">Content Pipeline</h1>
      <p className="mt-1 text-sm text-[#9a9ab0]">
        Raw media in, structured issue out. The structuring runs server-side in this MVP —
        deterministic and simulated, ready to swap for real transcription models.
      </p>

      <ol className="mt-6 flex items-center gap-2 text-xs font-semibold">
        {["Source", "Command", "Process", "Draft", "Live"].map((label, i) => {
          const idx = ["input", "command", "processing", "draft", "done"].indexOf(step);
          const state = i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-[#26263a]" />}
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  state === "active"
                    ? "border-violet-500/60 text-violet-300"
                    : state === "done"
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-[#26263a] text-[#5a5a72]"
                }`}
              >
                {state === "done" && <CheckIcon className="h-3 w-3" />}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === "input" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-dashed border-[#3a3a55] bg-[#10101c] p-6 text-center text-sm text-[#5a5a72]">
            Drag & drop video / audio here (mock) — or paste a transcript below
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder="Paste a raw transcript, show notes, or rough text…"
            className="w-full rounded-2xl border border-[#26263a] bg-[#10101c] p-4 text-sm leading-relaxed text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setRawText(SAMPLE_TRANSCRIPT)}
              className="rounded-xl border border-[#26263a] px-4 py-2 text-sm text-[#9a9ab0] transition-colors hover:border-violet-500/50 hover:text-white"
            >
              Load sample transcript
            </button>
            <button
              onClick={() => setStep("command")}
              disabled={rawText.trim().length < 50}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === "command" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[#26263a] bg-[#10101c] p-4 text-sm text-[#9a9ab0]">
            Source loaded: <span className="text-white">{rawText.trim().split(/\s+/).length} words</span>
          </div>
          <label className="block text-sm font-semibold text-white">
            Tell the AI what to do with it
          </label>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-full rounded-xl border border-[#26263a] bg-[#10101c] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60"
          />
          <div className="flex flex-wrap gap-2">
            {COMMAND_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setCommand(c)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  command === c
                    ? "border-violet-500/60 text-violet-300"
                    : "border-[#26263a] text-[#9a9ab0] hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep("input")} className="text-sm text-[#9a9ab0] hover:text-white">
              ← Back
            </button>
            <button
              onClick={() => {
                setProcStep(0);
                setStep("processing");
              }}
              disabled={!command.trim()}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              Run pipeline
            </button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#10101c] p-6">
          <div className="space-y-4">
            {PROCESS_STEPS.map((label, i) => {
              const state = i < procStep ? "done" : i === procStep ? "active" : "todo";
              return (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      state === "done"
                        ? "border-emerald-500/60 text-emerald-300"
                        : state === "active"
                          ? "border-violet-500/60 text-violet-300"
                          : "border-[#26263a] text-[#5a5a72]"
                    }`}
                  >
                    {state === "done" ? (
                      <CheckIcon className="h-3.5 w-3.5" />
                    ) : state === "active" ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#26263a]" />
                    )}
                  </span>
                  <span className={state === "todo" ? "text-[#5a5a72]" : "text-white"}>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-[#5a5a72]">
            Running on the server — in production this calls transcription + structuring models.
          </p>
        </div>
      )}

      {step === "draft" && draft && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-500/60"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Summary</label>
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
              Key points ({draft.keyPoints.length})
            </label>
            <div className="mt-1 space-y-2">
              {draft.keyPoints.map((kp, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={kp}
                    onChange={(e) => updateKp(i, e.target.value)}
                    className="flex-1 rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60"
                  />
                  <button
                    onClick={() =>
                      setDraft({ ...draft, keyPoints: draft.keyPoints.filter((_, j) => j !== i) })
                    }
                    className="rounded-xl border border-[#26263a] px-3 text-[#5a5a72] hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDraft({ ...draft, keyPoints: [...draft.keyPoints, ""] })}
                className="text-xs text-violet-300 hover:underline"
              >
                + Add key point
              </button>
            </div>
          </div>
          <details className="rounded-xl border border-[#26263a] bg-[#10101c] p-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
              Body preview — {draft.body.length} paragraphs · {draft.readMinutes} min read
            </summary>
            <div className="mt-3 space-y-3">
              {draft.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-[#c3c3d6]">
                  {p}
                </p>
              ))}
            </div>
          </details>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Season</label>
              <select
                value={draft.seasonId}
                onChange={(e) => setDraft({ ...draft, seasonId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              >
                <option value="current">Current season ({seasons[seasons.length - 1]?.title})</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value="new">+ New season</option>
              </select>
              {draft.seasonId === "new" && (
                <input
                  value={draft.newSeasonTitle}
                  onChange={(e) => setDraft({ ...draft, newSeasonTitle: e.target.value })}
                  placeholder={`Season ${seasons.length + 1} title`}
                  className="mt-2 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Access</label>
              <select
                value={draft.access}
                onChange={(e) => setDraft({ ...draft, access: e.target.value as Access })}
                className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              >
                <option value="free">Free — everyone</option>
                <option value="member">Members — subscribers only</option>
                <option value="archive">Archive — Token unlock</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep("input")} className="text-sm text-[#9a9ab0] hover:text-white">
              ← Start over
            </button>
            <button
              onClick={() => void publish()}
              disabled={publishing}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              {publishing ? "Publishing…" : "Publish issue"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
            <CheckIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">Issue is live</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            It is now visible in the member portal. Retrain the twin so it can answer questions
            about it.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/portal"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              View in member portal
            </Link>
            <Link
              href="/studio/twin"
              className="rounded-xl border border-[#26263a] px-5 py-2.5 text-sm font-semibold text-[#9a9ab0] transition-colors hover:text-white"
            >
              Go train twin
            </Link>
            <button
              onClick={() => {
                setRawText("");
                setDraft(null);
                setStep("input");
              }}
              className="text-sm text-[#9a9ab0] hover:text-white"
            >
              Publish another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
