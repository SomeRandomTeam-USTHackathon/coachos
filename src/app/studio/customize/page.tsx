"use client";

import { useState } from "react";
import PortalPreview from "@/components/customize/PortalPreview";
import SectionOrderEditor from "@/components/customize/SectionOrderEditor";
import ThemePicker from "@/components/customize/ThemePicker";
import { api } from "@/lib/api";
import { defaultPortalLayout } from "@/lib/portal";
import { useStore } from "@/lib/store";
import type { CreatorProfile, PortalLayout, PortalThemeId } from "@/lib/types";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60";
const labelCls = "text-xs font-bold uppercase tracking-widest text-[#9a9ab0]";

export default function CustomizePage() {
  const creator = useStore((s) => s.creator);

  // Unsaved draft state — nothing below touches the DB until Save.
  const [brand, setBrand] = useState(creator.brand);
  const [tagline, setTagline] = useState(creator.tagline);
  const [accent, setAccent] = useState(creator.accent ?? "#8b5cf6");
  const [themeId, setThemeId] = useState<PortalThemeId>(creator.theme ?? "midnight");
  const [layout, setLayout] = useState<PortalLayout>(creator.portalLayout ?? defaultPortalLayout());
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    brand !== creator.brand ||
    tagline !== creator.tagline ||
    accent !== (creator.accent ?? "#8b5cf6") ||
    themeId !== (creator.theme ?? "midnight") ||
    JSON.stringify(layout) !== JSON.stringify(creator.portalLayout ?? defaultPortalLayout());

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api<CreatorProfile>("/api/creator/portal", {
        brand,
        tagline,
        accent,
        theme: themeId,
        portalLayout: layout,
      });
      useStore.setState({ creator: next });
      // Sync the draft with what the server actually persisted (e.g. trimmed
      // strings), otherwise the dirty check would keep flagging phantom edits.
      setBrand(next.brand);
      setTagline(next.tagline);
      setAccent(next.accent ?? "#8b5cf6");
      setThemeId(next.theme ?? "midnight");
      setLayout(next.portalLayout ?? defaultPortalLayout());
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const next = await api<CreatorProfile>("/api/creator/launch", { launched: !creator.launched });
      useStore.setState({ creator: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish toggle failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Customize portal</h1>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            No-code builder — theme, branding, section order and visibility for the member portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {!error && dirty && <span className="text-xs font-semibold text-amber-300">Unsaved changes</span>}
          {!error && !dirty && savedAt !== null && (
            <span className="text-xs font-semibold text-emerald-300">Saved ✓</span>
          )}
          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-white">
                  Publish{" "}
                  <span
                    className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                      creator.launched
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {creator.launched ? "Live" : "Offline"}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-[#9a9ab0]">
                  {creator.launched
                    ? "Your portal is live for members."
                    : "Members see a “Portal is offline — check back soon” page."}
                </p>
                <p className="mt-1 text-xs text-[#5a5a72]">
                  While offline you can still preview it yourself: &quot;View as Member&quot; in the
                  header sets a sessionStorage flag in this browser (single-tenant demo gate —
                  instant, applies to the portal home only).
                </p>
              </div>
              <button
                role="switch"
                aria-checked={creator.launched}
                aria-label="Publish portal"
                onClick={() => void togglePublish()}
                disabled={publishing}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                  creator.launched ? "bg-emerald-500" : "bg-[#26263a]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
                    creator.launched ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <h2 className="font-bold text-white">Theme</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Dark-variant skins for the portal surfaces. Your accent color composes on top of any
              theme.
            </p>
            <ThemePicker value={themeId} accent={accent} onChange={setThemeId} />
          </section>

          <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <h2 className="font-bold text-white">Branding</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Same creator profile the setup wizard feeds — edits land in one shared row.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelCls}>Brand name</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Accent color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-[#26263a] bg-transparent"
                  />
                  <span className="font-mono text-sm text-[#9a9ab0]">{accent}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <h2 className="font-bold text-white">Sections</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Drag cards to reorder (or use the arrow buttons). Uncheck{" "}
              <span className="text-white">Show</span> to hide a section from members. The renewal
              reminder is a time-sensitive alert and always stays on top.
            </p>
            <SectionOrderEditor layout={layout} onChange={setLayout} />
          </section>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <PortalPreview brand={brand} tagline={tagline} accent={accent} themeId={themeId} layout={layout} />
          <p className="mt-2 text-xs text-[#5a5a72]">
            Live miniature — unsaved edits appear here instantly and reach members only after Save.
            The real portal picks them up on its next load.
          </p>
        </div>
      </div>
    </div>
  );
}
