"use client";

import { useState } from "react";
import { PORTAL_SECTIONS, resolveSectionOrder } from "@/lib/portal";
import type { PortalLayout, PortalSectionId } from "@/lib/types";

interface Props {
  layout: PortalLayout;
  onChange: (layout: PortalLayout) => void;
}

function ArrowIcon({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      {up ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}

// HTML5-native drag-and-drop reorder (no libs) with up/down buttons as the
// fallback, plus per-section show/hide checkboxes.
export default function SectionOrderEditor({ layout, onChange }: Props) {
  const order = resolveSectionOrder(layout);
  const hidden = new Set(layout.hidden);
  const [dragId, setDragId] = useState<PortalSectionId | null>(null);
  const [overId, setOverId] = useState<PortalSectionId | null>(null);

  const commitOrder = (next: PortalSectionId[]) => onChange({ order: next, hidden: layout.hidden });

  const move = (id: PortalSectionId, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commitOrder(next);
  };

  const toggleVisible = (id: PortalSectionId) => {
    const next = new Set(layout.hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ order, hidden: [...next] });
  };

  const clearDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <ul className="mt-3 space-y-2">
      {order.map((id, idx) => {
        const def = PORTAL_SECTIONS.find((s) => s.id === id);
        if (!def) return null;
        const isHidden = hidden.has(id);
        const dropTarget = overId === id && dragId !== null && dragId !== id;
        return (
          <li
            key={id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", id);
              e.dataTransfer.effectAllowed = "move";
              setDragId(id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overId !== id) setOverId(id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const src = (e.dataTransfer.getData("text/plain") || dragId) as PortalSectionId;
              if (src && src !== id && order.includes(src)) {
                const next = order.filter((s) => s !== src);
                next.splice(next.indexOf(id), 0, src);
                commitOrder(next);
              }
              clearDrag();
            }}
            onDragEnd={clearDrag}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              dropTarget ? "border-violet-500/60 bg-violet-500/5" : "border-[#26263a] bg-[#10101c]"
            } ${dragId === id ? "opacity-40" : ""} ${isHidden ? "opacity-60" : ""}`}
          >
            <span className="cursor-grab select-none text-sm leading-none text-[#5a5a72]" aria-hidden>
              ⠿
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{def.name}</div>
              <div className="truncate text-xs text-[#5a5a72]">{def.blurb}</div>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[#9a9ab0]">
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => toggleVisible(id)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              Show
            </label>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                aria-label={`Move ${def.name} up`}
                disabled={idx === 0}
                onClick={() => move(id, -1)}
                className="rounded border border-[#26263a] p-1 text-[#9a9ab0] transition-colors hover:border-violet-500/50 hover:text-white disabled:opacity-30"
              >
                <ArrowIcon up />
              </button>
              <button
                type="button"
                aria-label={`Move ${def.name} down`}
                disabled={idx === order.length - 1}
                onClick={() => move(id, 1)}
                className="rounded border border-[#26263a] p-1 text-[#9a9ab0] transition-colors hover:border-violet-500/50 hover:text-white disabled:opacity-30"
              >
                <ArrowIcon up={false} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
