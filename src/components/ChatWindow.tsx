"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { ChatSource } from "@/lib/types";

const SUGGESTED = [
  "How do I build a morning routine?",
  "What's the best way to start strength training?",
  "How important is sleep for recovery?",
  "How do I stay consistent with a new habit?",
];

function TypeText({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => Math.min(v + 3, text.length)), 12);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length ? <span className="text-violet-400">▍</span> : null}
    </>
  );
}

export default function ChatWindow() {
  const chat = useStore((s) => s.chat);
  const twin = useStore((s) => s.twin);
  const sendTwinMessage = useStore((s) => s.sendTwinMessage);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, typing]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setInput("");
    setTyping(true);
    try {
      const [id] = await Promise.all([
        sendTwinMessage(text),
        new Promise((r) => setTimeout(r, 600)),
      ]);
      setAnimatingId(id);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex h-[68vh] flex-col overflow-hidden rounded-2xl border border-[#26263a] bg-[#10101c]">
      <div className="flex items-center gap-3 border-b border-[#26263a] px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
          {twin.name[0]}
        </span>
        <div>
          <div className="text-sm font-bold text-white">{twin.name}</div>
          <div className="text-xs text-[#9a9ab0]">
            Trained on {twin.trainedIssueIds.length} issues · always on
          </div>
          {twin.disclosure && <div className="mt-0.5 max-w-xs text-[10px] leading-snug text-[#5a5a72]">{twin.disclosure}</div>}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <>
            <Bubble role="twin" name={twin.name} text={twin.greeting} />
            <div className="flex flex-wrap gap-2 pl-12">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-violet-500/40 px-3 py-1 text-xs text-violet-300 transition-colors hover:bg-violet-500/10"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {chat.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <Bubble
              key={m.id}
              role="twin"
              name={twin.name}
              text={m.id === animatingId ? undefined : m.text}
              typedText={m.id === animatingId ? m.text : undefined}
              source={m.source}
              verified={m.verified}
              sources={m.sources}
            />
          )
        )}

        {typing && (
          <div className="flex items-center gap-2 pl-12 text-xs text-[#9a9ab0]">
            <span className="animate-pulse">{twin.name} is thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-[#26263a] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${twin.name} anything…`}
          className="flex-1 rounded-xl border border-[#26263a] bg-[#0b0b14] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({
  role,
  name,
  text,
  typedText,
  source,
  verified,
  sources,
}: {
  role: "twin";
  name: string;
  text?: string;
  typedText?: string;
  source?: string;
  verified?: boolean | null;
  sources?: ChatSource[];
}) {
  void role;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">
        {name[0]}
      </span>
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-tl-sm border border-[#26263a] bg-[#171726] px-4 py-2.5 text-sm leading-relaxed text-[#e7e7f0]">
          {typedText !== undefined ? <TypeText text={typedText} /> : text}
        </div>
        <div className="mt-1 flex items-center gap-2 pl-1">
          {source ? (
            <span className="text-[11px] text-[#9a9ab0]">
              Source: <span className="text-violet-300">{source}</span>
            </span>
          ) : null}
          {verified === true && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              AI verified
            </span>
          )}
          {verified === false && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              Grounded fallback
            </span>
          )}
          {verified === null && (
            <span className="rounded-full border border-[#26263a] px-1.5 py-0.5 text-[10px] font-semibold text-[#5a5a72]">
              Mock mode
            </span>
          )}
        </div>
        {typedText === undefined && sources && sources.length > 0 && (
          <WhyThisAnswer sources={sources} />
        )}
      </div>
    </div>
  );
}

// Explainable-AI panel: which indexed chunks the answer was grounded in.
// Collapsed by default; expands with a smooth grid-rows animation.
function WhyThisAnswer({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5 pl-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] font-semibold text-violet-300/80 transition-colors hover:text-violet-200"
      >
        <span
          className={`inline-block text-[9px] transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        Why this answer
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 rounded-xl border border-[#26263a] bg-[#10101c] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72]">
              From indexed knowledge
            </p>
            {sources.map((s, i) => (
              <div key={`${s.docId}-${i}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-violet-300">
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#5a5a72]">
                    {Math.round(s.score * 100)}% relevant
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#26263a]">
                  <div
                    className="h-full rounded-full bg-violet-500/70 transition-all duration-500"
                    style={{ width: `${Math.max(6, Math.round(s.score * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#9a9ab0]">{s.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
