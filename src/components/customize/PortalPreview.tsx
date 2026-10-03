"use client";

import { Fragment } from "react";
import { ChatIcon } from "@/components/icons";
import { levelFor } from "@/lib/gamification";
import { themeById, visibleSections } from "@/lib/portal";
import { useStore } from "@/lib/store";
import type { PortalLayout, PortalSectionId, PortalThemeId } from "@/lib/types";

interface Props {
  brand: string;
  tagline: string;
  accent: string;
  themeId: PortalThemeId;
  layout: PortalLayout;
}

// Compact re-render of the member portal using the same theme tokens and
// section ids as the real thing. Purely presentational — every prop change
// (theme, accent, brand, tagline, section order/visibility) is reflected
// instantly, and nothing here touches the DB.
export default function PortalPreview({ brand, tagline, accent, themeId, layout }: Props) {
  const theme = themeById(themeId);
  const issues = useStore((s) => s.issues);
  const seasons = useStore((s) => s.seasons);
  const twin = useStore((s) => s.twin);
  const gam = useStore((s) => s.gam);
  const assets = useStore((s) => s.assets);
  const creator = useStore((s) => s.creator);
  const { level } = levelFor(gam.xp);

  const displayBrand = brand.trim() || "Brand";
  const sampleIssues = issues.slice(0, 3);
  const firstSeason = seasons.find((s) => sampleIssues.some((i) => i.seasonId === s.id));
  const sampleImages = assets.filter((a) => a.kind === "image").slice(0, 3);

  const mini: Record<PortalSectionId, React.ReactNode> = {
    hero: (
      <div
        className={`rounded-lg border bg-gradient-to-br ${theme.hero} p-3`}
        style={{ borderColor: `${accent}55` }}
      >
        <div className="text-[8px] font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
          {displayBrand} with {creator.name}
        </div>
        <div className="mt-0.5 text-sm font-black text-white">{tagline.trim() || "Your tagline"}</div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[`Lv ${level}`, `${gam.xp} XP`, `${gam.streak}d streak`, `${gam.tokens} tokens`].map((s) => (
            <div
              key={s}
              className={`rounded border ${theme.border} ${theme.stat} px-1 py-1 text-center text-[8px] font-semibold text-white`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),

    ghost: (
      <div className={`rounded-lg border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-950/40 ${theme.card} p-2.5`}>
        <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
          Ghost Coaching
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-white">Voice memo from your coach</div>
        <div className={`mt-1 h-2.5 w-3/4 rounded-full ${theme.track}`} />
      </div>
    ),

    issues: (
      <div>
        <div className="mb-1 text-[9px] font-bold text-white">{firstSeason?.title ?? "Issues"}</div>
        <div className="grid grid-cols-3 gap-1">
          {sampleIssues.map((i) => (
            <div key={i.id} className={`rounded border ${theme.border} ${theme.card} p-1.5`}>
              <div className="line-clamp-2 text-[8px] font-semibold leading-tight text-white">
                {i.title}
              </div>
            </div>
          ))}
          {sampleIssues.length === 0 && (
            <div className={`col-span-3 rounded border ${theme.border} ${theme.card} p-2 text-center text-[8px] ${theme.faint}`}>
              Published issues appear here
            </div>
          )}
        </div>
      </div>
    ),

    twin: (
      <div className={`flex items-center justify-between gap-2 rounded-lg border ${theme.border} ${theme.card} p-2.5`}>
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            <ChatIcon className="h-3 w-3" />
          </span>
          <div>
            <div className="text-[10px] font-bold text-white">Ask {twin.name || "the twin"}</div>
            <div className={`text-[8px] ${theme.muted}`}>Answers with sources</div>
          </div>
        </div>
        <span
          className="rounded-md px-2 py-1 text-[8px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Chat
        </span>
      </div>
    ),

    progress: (
      <div className={`flex items-center justify-between gap-2 rounded-lg border ${theme.border} ${theme.card} p-2.5`}>
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {level}
          </span>
          <div>
            <div className="text-[10px] font-bold text-white">Your progress</div>
            <div className={`text-[8px] ${theme.muted}`}>
              {gam.xp} XP · {gam.streak}-day streak
            </div>
          </div>
        </div>
        <span
          className="rounded-md border px-2 py-1 text-[8px] font-semibold"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          Quests →
        </span>
      </div>
    ),

    gallery: (
      <div>
        <div className="mb-1 text-[9px] font-bold text-white">Featured media</div>
        <div className="grid grid-cols-3 gap-1">
          {sampleImages.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={a.id}
              src={`/api/media/${a.id}?v=${a.version ?? 0}`}
              alt=""
              className={`aspect-video w-full rounded border ${theme.border} object-cover`}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - sampleImages.length) }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className={`aspect-video w-full rounded border ${theme.border} ${theme.soft}`}
            />
          ))}
        </div>
      </div>
    ),
  };

  const visible = visibleSections(layout);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#26263a] bg-[#10101c]">
      <div className="flex items-center gap-1.5 border-b border-[#26263a] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#3a3a55]" />
        <span className="h-2 w-2 rounded-full bg-[#3a3a55]" />
        <span className="h-2 w-2 rounded-full bg-[#3a3a55]" />
        <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-[#5a5a72]">
          Live preview — {theme.name}
        </span>
      </div>
      <div className="max-h-[560px] overflow-y-auto p-2.5" style={{ backgroundColor: theme.pageBg }}>
        <div className="pointer-events-none select-none space-y-2.5">
          <div className={`flex items-center gap-2 rounded-lg border ${theme.header} px-2 py-1.5`}>
            <span
              className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-black text-white"
              style={{ backgroundColor: accent }}
            >
              {displayBrand[0]}
            </span>
            <span className="text-[9px] font-bold text-white">{displayBrand} Portal</span>
            <span className="ml-auto flex gap-1">
              {["Issues", "AI Twin", "Progress"].map((n, i) => (
                <span
                  key={n}
                  className={`rounded px-1.5 py-0.5 text-[8px] ${i === 0 ? `${theme.chipActive} text-white` : theme.muted}`}
                >
                  {n}
                </span>
              ))}
            </span>
          </div>
          {visible.map((id) => (
            <Fragment key={id}>{mini[id]}</Fragment>
          ))}
          {visible.length === 0 && (
            <div className={`rounded-lg border ${theme.border} ${theme.card} p-4 text-center text-[9px] ${theme.faint}`}>
              All sections hidden — members will see an empty portal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
