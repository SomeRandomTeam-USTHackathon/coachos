"use client";

import { useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import KnowledgeManager from "@/components/knowledge/KnowledgeManager";
import { TONES } from "@/lib/twin";
import { useStore } from "@/lib/store";

export default function StudioTwinPage() {
  const twin = useStore((s) => s.twin);
  const issues = useStore((s) => s.issues);
  const ai = useStore((s) => s.ai);
  const saveTwin = useStore((s) => s.saveTwin);
  const saveAiSettings = useStore((s) => s.saveAiSettings);
  const trainTwin = useStore((s) => s.trainTwin);

  const [form, setForm] = useState({
    name: twin.name,
    tone: twin.tone,
    greeting: twin.greeting,
    disclosure: twin.disclosure ?? "",
  });
  const [model, setModel] = useState(ai.model);
  const [saved, setSaved] = useState(false);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);

  const chunks = useStore((s) => s.twinStats.chunks);
  const knowledge = useStore((s) => s.knowledge);
  const untrained = issues.filter((i) => !twin.trainedIssueIds.includes(i.id));

  const save = () => {
    void saveTwin({
      name: form.name.trim() || twin.name,
      tone: form.tone,
      greeting: form.greeting,
      disclosure: form.disclosure,
    });
    void saveAiSettings(undefined, model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const startTraining = () => {
    if (training) return;
    setTraining(true);
    setProgress(0);
    const started = Date.now();
    const t = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - started) / 1800) * 100));
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        setTraining(false);
        void trainTwin();
      }
    }, 50);
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white">AI Digital Twin</h1>
      <p className="mt-1 text-sm text-[#9a9ab0]">
        Your twin answers member questions using only your published content. Configure its
        persona, train it on new issues, and test it here.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <h2 className="font-bold text-white">Persona</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">Tone</label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
                >
                  {Object.entries(TONES).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
                  Greeting message
                </label>
                <textarea
                  value={form.greeting}
                  onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
                  Model (OpenRouter)
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="openai/gpt-4o-mini"
                  className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
                  AI disclosure (shown to subscribers)
                </label>
                <textarea
                  value={form.disclosure}
                  onChange={(e) => setForm({ ...form, disclosure: e.target.value })}
                  rows={2}
                  placeholder="e.g. This AI twin answers from my published content and may be imperfect."
                  className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
                />
              </div>
              <button
                onClick={save}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
              >
                {saved ? "Saved ✓" : "Save persona"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <h2 className="font-bold text-white">Training</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Indexed {twin.trainedIssueIds.length} of {issues.length} issues + {knowledge.length}{" "}
              knowledge docs · {chunks} chunks
              {twin.trainedAt
                ? ` · last trained ${new Date(twin.trainedAt).toLocaleString()}`
                : ""}
            </p>
            {knowledge.length > 0 && (
              <details className="mt-3 rounded-xl border border-[#26263a] bg-[#10101c] p-3">
                <summary className="cursor-pointer text-xs text-[#9a9ab0]">
                  {knowledge.length} training-only documents (never shown in the portal)
                </summary>
                <ul className="mt-2 space-y-1">
                  {knowledge.map((k) => (
                    <li key={k.id} className="text-xs text-[#c3c3d6]">
                      · {k.title}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {untrained.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
                {untrained.length} issue{untrained.length > 1 ? "s" : ""} not yet trained:{" "}
                {untrained.map((i) => i.title).join(", ")}
              </div>
            )}
            {training ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-[#26263a]">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[#9a9ab0]">
                  Indexing content chunks… {progress}% (simulated)
                </p>
              </div>
            ) : (
              <button
                onClick={startTraining}
                className="mt-4 rounded-xl border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
              >
                {untrained.length > 0 ? "Retrain on all issues" : "Retrain"}
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold text-white">Test chat</h2>
          <ChatWindow />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
        <KnowledgeManager />
      </div>
    </div>
  );
}
