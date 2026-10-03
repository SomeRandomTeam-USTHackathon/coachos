"use client";

import { useEffect, useRef, useState } from "react";
import EditTimeline, { normalizeEdits } from "@/components/EditTimeline";
import { useStore } from "@/lib/store";
import type { EditPoint, MediaAsset } from "@/lib/types";

const KIND_STYLE: Record<string, string> = {
  image: "border-emerald-500/40 text-emerald-300",
  video: "border-sky-500/40 text-sky-300",
  audio: "border-amber-500/40 text-amber-300",
};

const VOICE_LINES: Record<string, string[]> = {
  audio: [
    "trim silent pauses and remove filler words",
    "clean background hum",
    "remove filler words and trim to 45s",
  ],
  video: [
    "clean background hum and remove filler words",
    "trim silent pauses",
    "remove filler words and trim to 60s",
  ],
  image: ["crop square and filter bw", "filter bw", "crop square"],
};

const MAX_VOICE_SECONDS = 15;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Staged processing labels mirroring the parsed command, so the mock pipeline
// feels like it is doing the work the user asked for.
function stagesFor(command: string, kind: string): string[] {
  const stages: string[] = [kind === "image" ? "Analyzing image…" : "Analyzing audio…"];
  if (/silent|silence/i.test(command)) stages.push("Detecting silent pauses…");
  if (/filler|\bums?\b|\buhs?\b/i.test(command)) stages.push("Scanning for filler words…");
  if (/hum|noise|clean|denoise/i.test(command)) stages.push("Isolating background hum…");
  if (/trim/i.test(command)) stages.push("Calculating cut points…");
  if (/crop/i.test(command)) stages.push("Re-framing crop…");
  if (/filter/i.test(command)) stages.push("Applying color grade…");
  if (/caption/i.test(command)) stages.push("Rendering captions…");
  stages.push("Applying edits…");
  return stages;
}

// The one REAL edit path: bake `crop square` / `filter bw` into actual image
// bytes client-side via Canvas, returns the transformed blob plus an object URL
// of the untouched original for the before/after toggle.
async function applyRealImageEdits(
  src: string,
  command: string
): Promise<{ blob: Blob; beforeUrl: string } | null> {
  const cropSquare = /crop\s+(square|1:1)/i.test(command);
  const bw = /filter\s+(bw|black\s?and\s?white)/i.test(command);
  if (!cropSquare && !bw) return null;
  try {
    const res = await fetch(src);
    const orig = await res.blob();
    const bitmap = await createImageBitmap(orig);
    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (cropSquare) {
      const side = Math.min(sw, sh);
      sx = (sw - side) / 2;
      sy = (sh - side) / 2;
      sw = side;
      sh = side;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    let manualBw = false;
    if (bw) {
      ctx.filter = "grayscale(1)";
      manualBw = ctx.filter !== "grayscale(1)"; // older engines: fall back to pixels
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if (bw && manualBw) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return { blob, beforeUrl: URL.createObjectURL(orig) };
  } catch {
    return null;
  }
}

function AssetCard({ asset }: { asset: MediaAsset }) {
  const applyAssetEdit = useStore((s) => s.applyAssetEdit);
  const removeAssetEditPoint = useStore((s) => s.removeAssetEditPoint);
  const replaceAssetImage = useStore((s) => s.replaceAssetImage);
  const setAssetFeatured = useStore((s) => s.setAssetFeatured);
  const deleteAsset = useStore((s) => s.deleteAsset);
  const refreshAssets = useStore((s) => s.refreshAssets);

  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [proc, setProc] = useState<{ stages: string[]; index: number } | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [view, setView] = useState<"after" | "before">("after");
  const [recState, setRecState] = useState<"idle" | "recording" | "error">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef = useRef(0);
  const voiceApplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editPoints = asset.editPoints ?? normalizeEdits(asset.edits);
  const version = asset.version ?? 0;
  const mediaSrc = `/api/media/${asset.id}?v=${version}`;

  useEffect(
    () => () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (voiceApplyRef.current) clearTimeout(voiceApplyRef.current);
    },
    []
  );

  useEffect(
    () => () => {
      if (beforeUrl) URL.revokeObjectURL(beforeUrl);
    },
    [beforeUrl]
  );

  const runEdit = async (cmd: string) => {
    if (busy) return;
    setBusy(true);
    const stages = stagesFor(cmd, asset.kind);
    const TOTAL_MS = 3000;
    const perStage = TOTAL_MS / stages.length;
    const anim = (async () => {
      for (let i = 0; i < stages.length; i++) {
        setProc({ stages, index: i });
        await new Promise((r) => setTimeout(r, perStage));
      }
    })();
    const server = (async (): Promise<EditPoint[]> => {
      const applied = await applyAssetEdit(asset.id, cmd);
      if (asset.kind === "image") {
        const real = await applyRealImageEdits(mediaSrc, cmd);
        if (real) {
          setBeforeUrl(real.beforeUrl);
          await replaceAssetImage(asset.id, real.blob);
          setView("after");
        }
      }
      return applied;
    })();
    try {
      const [applied] = await Promise.all([server, anim]);
      setProc({
        stages: [...stages.slice(0, -1), `Applied ${applied.length} edit${applied.length === 1 ? "" : "s"} ✓`],
        index: stages.length - 1,
      });
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // store actions surface failures via thrown errors; keep the card usable
    } finally {
      setProc(null);
      setBusy(false);
    }
  };

  const apply = () => {
    const cmd = command.trim();
    if (!cmd || busy) return;
    setCommand("");
    void runEdit(cmd);
  };

  const stopVoice = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecState("idle");
        // Simulated STT: deterministic pick from this asset kind's command set.
        const lines = VOICE_LINES[asset.kind] ?? VOICE_LINES.image;
        const line = lines[(hashStr(asset.id) + recSecondsRef.current) % lines.length];
        setHeard(line);
        voiceApplyRef.current = setTimeout(() => void runEdit(line), 700);
      };
      rec.start();
      recSecondsRef.current = 0;
      setRecSeconds(0);
      setRecState("recording");
      recTimerRef.current = setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
        if (recSecondsRef.current >= MAX_VOICE_SECONDS) stopVoice();
      }, 1000);
    } catch {
      setRecState("error");
    }
  };

  const exportCopy = async () => {
    const res = await fetch(mediaSrc);
    const blob = await res.blob();
    const rawExt = (asset.mime.split("/")[1] ?? "bin").split(";")[0];
    const ext = asset.kind === "audio" && rawExt === "mp4" ? "m4a" : rawExt;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coachos-edit-${asset.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${KIND_STYLE[asset.kind] ?? "border-[#26263a] text-[#9a9ab0]"}`}>
            {asset.kind}
          </span>
          {asset.featured && <span className="text-[10px] font-bold text-amber-300">★ Featured</span>}
        </div>
        <button
          onClick={() => void deleteAsset(asset.id).then(() => refreshAssets())}
          className="text-xs text-[#5a5a72] hover:text-red-400"
        >
          Delete
        </button>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-xl bg-[#0b0b14]">
        {asset.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view === "before" && beforeUrl ? beforeUrl : mediaSrc}
            alt="asset"
            className="max-h-44 w-full object-cover"
          />
        )}
        {asset.kind === "video" && <video src={mediaSrc} controls className="max-h-44 w-full" />}
        {asset.kind === "audio" && <audio src={mediaSrc} controls className="h-10 w-full" />}
        {asset.kind === "image" && beforeUrl && (
          <div className="absolute right-2 top-2 flex rounded-full bg-black/70 p-0.5 text-[10px] font-bold">
            {(["before", "after"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-2.5 py-1 capitalize transition-colors ${
                  view === v ? "bg-violet-600 text-white" : "text-[#9a9ab0] hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-[#5a5a72]">
        {Math.round(asset.size / 1024)} KB
        {asset.durationSec ? ` · ${asset.durationSec}s` : ""} · {new Date(asset.createdAt).toLocaleDateString()}
        {version > 0 ? ` · v${version}` : ""}
      </div>

      {editPoints.length > 0 && (
        <div className="mt-3">
          <EditTimeline
            assetId={asset.id}
            kind={asset.kind}
            durationSec={asset.durationSec}
            edits={editPoints}
            onRemove={(editId) => void removeAssetEditPoint(asset.id, editId)}
          />
        </div>
      )}

      <div className="mt-3">
        <div className="flex gap-2">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder={
              asset.kind === "image"
                ? 'e.g. crop square and filter bw, or caption "Hello"'
                : "e.g. trim silent pauses and remove filler words"
            }
            className="flex-1 rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-xs text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <button
            onClick={() => (recState === "recording" ? stopVoice() : void startVoice())}
            disabled={busy}
            title={recState === "recording" ? "Stop voice command" : "Voice command (max 15s)"}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
              recState === "recording"
                ? "border-red-500/50 text-red-300 hover:bg-red-500/10"
                : "border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
            }`}
          >
            {recState === "recording" ? `■ ${recSeconds}s` : "🎙"}
          </button>
          <button
            onClick={apply}
            disabled={!command.trim() || busy}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Apply
          </button>
        </div>

        {recState === "error" && (
          <div className="mt-1.5 text-[11px] text-red-400">Microphone unavailable — type the command instead.</div>
        )}
        {heard && (
          <div className="mt-1.5 text-[11px] text-[#9a9ab0]">
            Heard: <span className="text-white">“{heard}”</span>
          </div>
        )}

        {proc && (
          <div className="mt-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-violet-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
              {proc.stages[proc.index]}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#26263a]">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${((proc.index + 1) / proc.stages.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#26263a] pt-3">
        <button
          onClick={() => void exportCopy()}
          className="rounded-xl border border-[#3a3a55] px-3 py-1.5 text-xs font-semibold text-[#9a9ab0] transition-colors hover:border-violet-500/50 hover:text-white"
        >
          Export edited copy
        </button>
        <button
          onClick={() => void setAssetFeatured(asset.id, !asset.featured)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
            asset.featured
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-[#3a3a55] text-[#9a9ab0] hover:border-amber-500/50 hover:text-amber-300"
          }`}
        >
          {asset.featured ? "★ Pushed to portal" : "☆ Push to portal"}
        </button>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const assets = useStore((s) => s.assets);
  const uploadAsset = useStore((s) => s.uploadAsset);
  const refreshAssets = useStore((s) => s.refreshAssets);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Bootstrap assets lack editPoints/featured/version — pull the full view once.
  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const onPick = async (f: File | undefined) => {
    if (!f || uploading) return;
    setUploading(true);
    try {
      await uploadAsset(f);
      await refreshAssets();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Assets</h1>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            Image, video and audio library, stored in S3-style object storage and delivered via
            the mock CDN route. Edit with text or voice commands — image filters and crops are
            baked into the real file; audio/video cleanup is visualized on the edit timeline.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Upload asset"}
          </button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#3a3a55] bg-[#10101c] p-12 text-center text-sm text-[#5a5a72]">
          No assets yet — upload an image, video or audio file to get started.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}
