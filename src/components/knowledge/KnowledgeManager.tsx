"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { KnowledgeDocMeta } from "@/lib/types";

type Tab = "paste" | "upload" | "url";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60";
const labelCls = "text-xs font-bold uppercase tracking-widest text-[#9a9ab0]";

export default function KnowledgeManager() {
  const addKnowledgeText = useStore((s) => s.addKnowledgeText);
  const setKnowledgeMeta = useStore((s) => s.setKnowledgeMeta);

  const [docs, setDocs] = useState<KnowledgeDocMeta[] | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("paste");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"add" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/knowledge");
    const data = (await res.json()) as { docs: KnowledgeDocMeta[] };
    setDocs(data.docs);
    // Keep the global store (persona/training counters) in sync with the DB.
    setKnowledgeMeta(data.docs.map((d) => ({ id: d.id, title: d.title })));
  }, [setKnowledgeMeta]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/knowledge")
      .then((res) => res.json())
      .then((data: { docs: KnowledgeDocMeta[] }) => {
        if (cancelled) return;
        setDocs(data.docs);
        setKnowledgeMeta(data.docs.map((d) => ({ id: d.id, title: d.title })));
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [setKnowledgeMeta]);

  const filtered = (docs ?? []).filter((d) => {
    const q = query.trim().toLowerCase();
    return !q || d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q);
  });
  const totalChars = (docs ?? []).reduce((n, d) => n + d.chars, 0);

  const addPaste = async () => {
    const text = pasteText.trim();
    if (text.length < 50 || busy) {
      setError("Paste at least 50 characters so the twin has something to learn from.");
      return;
    }
    setBusy("add");
    setError(null);
    try {
      const title = pasteTitle.trim() || text.split(/\s+/).slice(0, 7).join(" ");
      await addKnowledgeText(title, text);
      setPasteTitle("");
      setPasteText("");
      setNotice(`Added "${title}".`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add the document");
    } finally {
      setBusy(null);
    }
  };

  const onFile = (f: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (!text.trim()) {
        setError(`${f.name} looks empty.`);
        return;
      }
      setPasteText(text);
      setPasteTitle(f.name.replace(/\.(txt|md|markdown)$/i, ""));
      setTab("paste");
      setNotice(`Loaded ${f.name} — review it below, then add it.`);
    };
    reader.onerror = () => setError(`Couldn't read ${f.name}.`);
    reader.readAsText(f);
  };

  const importUrl = async () => {
    const u = url.trim();
    if (!u || busy) return;
    setBusy("import");
    setError(null);
    try {
      const res = await fetch("/api/knowledge/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = (await res.json()) as {
        doc?: { id: string; title: string };
        chars?: number;
        truncated?: boolean;
        error?: string;
      };
      if (!res.ok || !data.doc) {
        setError(data.error ?? `Import failed (HTTP ${res.status})`);
        return;
      }
      setUrl("");
      setNotice(
        `Imported "${data.doc.title}" (${data.chars ?? 0} chars${data.truncated ? ", capped at 20k" : ""}).`
      );
      await refresh();
    } catch {
      setError("Import failed — network error.");
    } finally {
      setBusy(null);
    }
  };

  const startEdit = async (doc: KnowledgeDocMeta) => {
    setError(null);
    setConfirmDeleteId(null);
    const res = await fetch(`/api/knowledge?id=${encodeURIComponent(doc.id)}`);
    const data = (await res.json()) as { text?: string; doc?: { title: string } };
    setEditTitle(data.doc?.title ?? doc.title);
    setEditText(data.text ?? doc.preview);
    setEditingId(doc.id);
  };

  const saveEdit = async () => {
    if (!editingId || savingEdit) return;
    if (!editTitle.trim() || !editText.trim()) {
      setError("Title and text can't be empty.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title: editTitle, text: editText }),
      });
      if (!res.ok) {
        setError(`Save failed (HTTP ${res.status})`);
        return;
      }
      setEditingId(null);
      setNotice("Document updated — the twin uses the new text immediately.");
      await refresh();
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`Delete failed (HTTP ${res.status})`);
      return;
    }
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
    setNotice("Document deleted — it no longer feeds the twin.");
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-white">Knowledge base</h2>
          <p className="mt-0.5 text-xs text-[#9a9ab0]">
            Training-only documents — indexed for the twin, never shown as portal content.
          </p>
        </div>
        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
          {docs === null ? "…" : `${docs.length} docs indexed · ${totalChars.toLocaleString()} chars`}
        </span>
      </div>

      <div className="rounded-2xl border border-[#26263a] bg-[#10101c] p-4">
        <div className="flex gap-2">
          {(
            [
              ["paste", "Paste text"],
              ["upload", "Upload .txt / .md"],
              ["url", "Import URL"],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                if (key === "upload") fileRef.current?.click();
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === key
                  ? "bg-violet-600 text-white"
                  : "border border-[#26263a] text-[#9a9ab0] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />

        {tab === "url" ? (
          <div className="mt-3">
            <label className={labelCls}>Page URL</label>
            <div className="mt-1 flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void importUrl();
                }}
                placeholder="https://example.com/my-best-article"
                className="flex-1 rounded-xl border border-[#26263a] bg-[#14141f] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
              />
              <button
                type="button"
                onClick={() => void importUrl()}
                disabled={!url.trim() || busy !== null}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
              >
                {busy === "import" ? "Importing…" : "Import"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#5a5a72]">
              Fetches the page server-side, strips the HTML, and indexes up to 20k characters.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {tab === "upload" && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-violet-500/40 px-4 py-6 text-sm text-violet-300 transition-colors hover:bg-violet-500/10"
              >
                Choose a .txt or .md file — it loads into the paste box for review
              </button>
            )}
            <div>
              <label className={labelCls}>Title (optional)</label>
              <input
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="Auto-generated from the first words if empty"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Text</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                placeholder="Paste an essay, show notes, FAQ answers… (min 50 characters)"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-[#5a5a72]">{pasteText.length.toLocaleString()} characters</p>
            </div>
            <button
              type="button"
              onClick={() => void addPaste()}
              disabled={pasteText.trim().length < 50 || busy !== null}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              {busy === "add" ? "Adding…" : "Add to knowledge base"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 text-xs text-rose-300">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-300">
            {notice}
          </p>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents…"
        className="w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
      />

      <div className="space-y-2">
        {docs === null && <p className="text-xs text-[#5a5a72]">Loading documents…</p>}
        {docs !== null && filtered.length === 0 && (
          <p className="text-xs text-[#5a5a72]">
            {docs.length === 0 ? "No documents yet — add one above." : "No documents match that search."}
          </p>
        )}
        {filtered.map((d) => (
          <div key={d.id} className="rounded-xl border border-[#26263a] bg-[#10101c] p-3">
            {editingId === d.id ? (
              <div className="space-y-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputCls}
                />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={7}
                  className={inputCls}
                />
                <p className="text-[11px] text-[#5a5a72]">
                  {editText.length.toLocaleString()} characters · saved text replaces what the twin retrieves from this doc
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={savingEdit}
                    className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
                  >
                    {savingEdit ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-xl border border-[#26263a] px-3 py-1.5 text-xs font-semibold text-[#9a9ab0] transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#5a5a72]">
                      {d.chars.toLocaleString()} chars · added {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void startEdit(d)}
                      className="rounded-lg border border-[#26263a] px-2.5 py-1 text-[11px] font-semibold text-[#9a9ab0] transition-colors hover:text-white"
                    >
                      Edit
                    </button>
                    {confirmDeleteId === d.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void remove(d.id)}
                          className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[#26263a] px-2.5 py-1 text-[11px] font-semibold text-[#9a9ab0] transition-colors hover:text-white"
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(d.id);
                          setEditingId(null);
                        }}
                        className="rounded-lg border border-[#26263a] px-2.5 py-1 text-[11px] font-semibold text-[#9a9ab0] transition-colors hover:border-rose-500/40 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#9a9ab0]">{d.preview}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
