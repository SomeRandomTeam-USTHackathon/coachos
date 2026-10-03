"use client";

import type { EditPoint } from "@/lib/types";

// Normalize whatever came over the wire (legacy plain-string labels or
// structured EditPoint objects) into EditPoint[].
export function normalizeEdits(edits: unknown[] | undefined): EditPoint[] {
  if (!Array.isArray(edits)) return [];
  return edits.map((e, i) =>
    typeof e === "string" || typeof e !== "object" || e === null
      ? { id: `legacy-${i}`, op: "legacy" as const, label: String(e), atSec: 0 }
      : (e as EditPoint)
  );
}

interface OpMeta {
  name: string;
  dot: string;
  band: string;
  chip: string;
}

const OP_META: Record<string, OpMeta> = {
  hum: { name: "Denoise", dot: "bg-amber-400", band: "bg-amber-400/15", chip: "border-amber-500/40 text-amber-300" },
  filler: { name: "Filler cut", dot: "bg-rose-400", band: "bg-rose-400/15", chip: "border-rose-500/40 text-rose-300" },
  silence: { name: "Silence trim", dot: "bg-sky-400", band: "bg-sky-400/15", chip: "border-sky-500/40 text-sky-300" },
  trim: { name: "Trim", dot: "bg-violet-400", band: "bg-violet-400/15", chip: "border-violet-500/40 text-violet-300" },
  caption: { name: "Caption", dot: "bg-emerald-400", band: "bg-emerald-400/15", chip: "border-emerald-500/40 text-emerald-300" },
  crop: { name: "Crop", dot: "bg-orange-400", band: "bg-orange-400/15", chip: "border-orange-500/40 text-orange-300" },
  filter: { name: "Filter", dot: "bg-fuchsia-400", band: "bg-fuchsia-400/15", chip: "border-fuchsia-500/40 text-fuchsia-300" },
  enhance: { name: "Enhance", dot: "bg-indigo-400", band: "bg-indigo-400/15", chip: "border-indigo-500/40 text-indigo-300" },
  legacy: { name: "Edit", dot: "bg-zinc-400", band: "bg-zinc-400/15", chip: "border-zinc-500/40 text-zinc-300" },
};

const metaFor = (op: string): OpMeta => OP_META[op] ?? OP_META.legacy;

const POP_KEYFRAMES = "@keyframes edit-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// Deterministic decorative waveform heights (18–100%).
function waveHeight(seed: string, i: number): number {
  const x = Math.sin(hashCode(seed) + i * 12.9898) * 43758.5453;
  return 18 + (Math.abs(x) % 1) * 82;
}

export default function EditTimeline({
  assetId,
  kind,
  durationSec,
  edits,
  onRemove,
}: {
  assetId: string;
  kind: string;
  durationSec: number | null;
  edits: EditPoint[];
  onRemove: (editId: string) => void;
}) {
  if (kind === "image") {
    return (
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#5a5a72]">Edit stack</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {edits.map((e, i) => (
            <button
              key={e.id}
              onClick={() => onRemove(e.id)}
              title="Remove this edit"
              className={`group flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${metaFor(e.op).chip}`}
              style={{ animation: "edit-pop .3s ease both", animationDelay: `${i * 70}ms` }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${metaFor(e.op).dot}`} />
              {e.label}
              <span className="text-[#5a5a72] transition-colors group-hover:text-red-400">×</span>
            </button>
          ))}
        </div>
        <style>{POP_KEYFRAMES}</style>
      </div>
    );
  }

  const lastEnd = edits.reduce((m, e) => Math.max(m, e.atSec + (e.durSec ?? 0)), 0);
  const dur = durationSec && durationSec > 0 ? durationSec : Math.max(60, Math.ceil(lastEnd / 15) * 15);
  const ops = [...new Set(edits.map((e) => e.op))];

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a5a72]">Edit timeline</span>
        <span className="font-mono text-[10px] text-[#5a5a72]">{fmt(dur)}</span>
      </div>

      <div className="relative mt-1.5 h-16 overflow-hidden rounded-xl border border-[#26263a] bg-[#0b0b14]">
        <div className="absolute inset-0 flex items-center gap-[2px] px-1.5">
          {Array.from({ length: 56 }).map((_, i) => (
            <div key={i} className="w-full rounded-full bg-[#2c2c44]" style={{ height: `${waveHeight(assetId, i)}%` }} />
          ))}
        </div>

        {edits.map((e) =>
          e.durSec ? (
            <div
              key={`band-${e.id}`}
              className={`absolute top-0 h-full ${metaFor(e.op).band}`}
              style={{
                left: `${(e.atSec / dur) * 100}%`,
                width: `${Math.min(100 - (e.atSec / dur) * 100, (e.durSec / dur) * 100)}%`,
              }}
            />
          ) : null
        )}

        {edits.map((e, i) => {
          const meta = metaFor(e.op);
          const left = Math.min(97, Math.max(1, (e.atSec / dur) * 100));
          return (
            <button
              key={e.id}
              onClick={() => onRemove(e.id)}
              className="group absolute top-0 flex h-full w-3 -translate-x-1/2 cursor-pointer justify-center"
              style={{ left: `${left}%`, animation: "edit-pop .35s ease both", animationDelay: `${i * 80}ms` }}
            >
              <span className={`w-[3px] rounded-full ${meta.dot} opacity-70 transition-opacity group-hover:opacity-100`} />
              <span className={`absolute top-1 h-2.5 w-2.5 rounded-full ${meta.dot} ring-2 ring-[#0b0b14]`} />
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[#26263a] bg-[#14141f] px-2 py-1 text-[10px] text-white shadow-xl group-hover:block">
                {e.label} <span className="text-[#9a9ab0]">@ {fmt(e.atSec)} · click to remove</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between font-mono text-[9px] text-[#5a5a72]">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{fmt(dur * f)}</span>
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {ops.map((op) => (
          <span key={op} className="flex items-center gap-1 text-[10px] text-[#9a9ab0]">
            <span className={`h-1.5 w-1.5 rounded-full ${metaFor(op).dot}`} />
            {metaFor(op).name}
          </span>
        ))}
      </div>
      <style>{POP_KEYFRAMES}</style>
    </div>
  );
}
