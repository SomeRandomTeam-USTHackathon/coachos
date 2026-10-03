"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import AccessChip from "@/components/AccessChip";
import GhostMemoCard from "@/components/GhostMemoCard";
import { ChatIcon, CheckIcon, FlameIcon, KeyIcon, LockIcon, StarIcon } from "@/components/icons";
import { canAccess } from "@/lib/access";
import { levelFor } from "@/lib/gamification";
import { CREATOR_PREVIEW_KEY, resolveSectionOrder, themeById, visibleSections } from "@/lib/portal";
import { useStore } from "@/lib/store";
import type { PortalSectionId } from "@/lib/types";
import { formatPrice } from "@/components/Checkout";

const RENEW_MS = 30 * 24 * 3600 * 1000;

export default function PortalHome() {
  const issues = useStore((s) => s.issues);
  const seasons = useStore((s) => s.seasons);
  const subscribed = useStore((s) => s.subscribed);
  const gam = useStore((s) => s.gam);
  const member = useStore((s) => s.member);
  const tiers = useStore((s) => s.tiers);
  const twin = useStore((s) => s.twin);
  const assets = useStore((s) => s.assets);
  const refreshAssets = useStore((s) => s.refreshAssets);
  const openCheckout = useStore((s) => s.openCheckout);
  const subscribe = useStore((s) => s.subscribe);
  const touch = useStore((s) => s.touch);

  // Visiting the portal counts as the daily check-in activity.
  useEffect(() => {
    void touch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { level, into, needed } = levelFor(gam.xp);
  const firstTier = tiers[0];
  const [mountTime] = useState(() => Date.now());
  const renewDue =
    subscribed && member.subscribedAt && mountTime - new Date(member.subscribedAt).getTime() > RENEW_MS;

  const creator = useStore((s) => s.creator);
  const accent = creator.accent ?? "#8b5cf6";
  const theme = themeById(creator.theme);
  const layout = creator.portalLayout ?? null;

  // Single-tenant demo gate: "View as Member" in the studio header sets a
  // sessionStorage flag marking this tab as the creator's own preview. Read
  // lazily at mount — StoreGate renders this page client-side only.
  const [creatorPreview] = useState(() => {
    try {
      return window.sessionStorage.getItem(CREATOR_PREVIEW_KEY) === "1";
    } catch {
      return false; // sessionStorage unavailable — stay in member view
    }
  });

  // Apply the theme's page background while the portal home is mounted.
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = theme.pageBg;
    return () => {
      document.body.style.background = prev;
    };
  }, [theme.pageBg]);

  // The featured flags behind the gallery only exist on the full asset payload.
  const wantsGallery = visibleSections(layout).includes("gallery");
  useEffect(() => {
    if (wantsGallery) void refreshAssets();
  }, [wantsGallery, refreshAssets]);

  // Unpublished portal: members get an offline notice; the creator keeps full
  // access through the preview flag.
  if (!creator.launched && !creatorPreview) {
    return (
      <div className={`rounded-2xl border ${theme.border} ${theme.card} p-10 text-center sm:p-14`}>
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white"
          style={{ backgroundColor: accent }}
        >
          {creator.brand[0] ?? "C"}
        </span>
        <h1 className="mt-4 text-2xl font-black text-white">Portal is offline — check back soon</h1>
        <p className={`mx-auto mt-2 max-w-sm text-sm ${theme.muted}`}>
          {creator.brand} is taking a short break. New issues, the AI twin and member perks will be
          back before you know it.
        </p>
        <p className={`mt-6 text-xs ${theme.faint}`}>
          Are you the creator? Republish from{" "}
          <Link href="/studio/customize" className="underline underline-offset-2">
            Studio → Customize
          </Link>
          , or use &quot;View as Member&quot; in the header to preview.
        </p>
      </div>
    );
  }

  const featured = assets.filter((a) => a.featured);

  const sections: Record<PortalSectionId, React.ReactNode> = {
    hero: (
      <section
        className={`overflow-hidden rounded-2xl border bg-gradient-to-br ${theme.hero} p-6 sm:p-8`}
        style={{ borderColor: `${accent}55` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
              {creator.brand} with {creator.name}
            </div>
            <h1 className="mt-2 text-3xl font-black text-white">{creator.tagline}</h1>
            <p className={`mt-1 text-sm ${theme.muted}`}>
              New issues every week. Read, ask the twin, keep the streak alive.
            </p>
          </div>
          {subscribed ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              Subscribed ✓
            </span>
          ) : (
            <button
              onClick={openCheckout}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              Subscribe{firstTier ? ` — ${formatPrice(firstTier)}/mo` : ""} (mock)
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`rounded-xl border ${theme.border} ${theme.stat} p-3`}>
            <div className={`flex items-center gap-1.5 text-xs ${theme.muted}`}>
              <StarIcon className="h-3.5 w-3.5 text-amber-300" /> Level
            </div>
            <div className="mt-1 text-xl font-black text-white">{level}</div>
            <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${theme.track}`}>
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.round((into / needed) * 100)}%` }}
              />
            </div>
          </div>
          <div className={`rounded-xl border ${theme.border} ${theme.stat} p-3`}>
            <div className={`text-xs ${theme.muted}`}>Total XP</div>
            <div className="mt-1 text-xl font-black text-white">{gam.xp}</div>
            <div className={`mt-1.5 text-[10px] ${theme.faint}`}>
              {needed - into} XP to level {level + 1}
            </div>
          </div>
          <div className={`rounded-xl border ${theme.border} ${theme.stat} p-3`}>
            <div className={`flex items-center gap-1.5 text-xs ${theme.muted}`}>
              <FlameIcon className="h-3.5 w-3.5 text-orange-400" /> Streak
            </div>
            <div className="mt-1 text-xl font-black text-white">{gam.streak} days</div>
            <div className={`mt-1.5 text-[10px] ${theme.faint}`}>7-day streak earns a Token</div>
          </div>
          <div className={`rounded-xl border ${theme.border} ${theme.stat} p-3`}>
            <div className={`flex items-center gap-1.5 text-xs ${theme.muted}`}>
              <KeyIcon className="h-3.5 w-3.5 text-sky-300" /> Archive Tokens
            </div>
            <div className="mt-1 text-xl font-black text-white">{gam.tokens}</div>
            <div className={`mt-1.5 text-[10px] ${theme.faint}`}>Spend on archive issues</div>
          </div>
        </div>
      </section>
    ),

    ghost: <GhostMemoCard />,

    issues: (
      <>
        {seasons.map((season) => {
          const list = issues.filter((i) => i.seasonId === season.id);
          if (list.length === 0) return null;
          return (
            <section key={season.id}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-white">{season.title}</h2>
                <span className={`text-xs ${theme.faint}`}>{season.month}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((issue) => {
                  const accessible = canAccess(issue, subscribed, gam.unlockedArchiveIds);
                  const completed = gam.completedIssueIds.includes(issue.id);
                  return (
                    <Link
                      key={issue.id}
                      href={`/portal/issue/${issue.id}`}
                      className={`group flex flex-col rounded-2xl border ${theme.border} ${theme.card} p-5 transition-all hover:border-violet-500/50 ${theme.cardHover}`}
                    >
                      <div className="flex items-center justify-between">
                        <AccessChip access={issue.access} />
                        {completed ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
                            <CheckIcon className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : !accessible ? (
                          <LockIcon className={`h-4 w-4 ${theme.faint}`} />
                        ) : null}
                      </div>
                      <h3 className="mt-3 font-bold leading-snug text-white group-hover:text-violet-200">
                        {issue.title}
                      </h3>
                      <p className={`mt-2 line-clamp-2 flex-1 text-xs leading-relaxed ${theme.muted}`}>
                        {issue.summary}
                      </p>
                      <div className={`mt-3 text-[11px] ${theme.faint}`}>
                        {issue.publishedAt} · {issue.readMinutes} min · +50 XP
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </>
    ),

    twin: (
      <section
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border ${theme.border} ${theme.card} p-6`}
      >
        <div className="flex items-center gap-4">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            <ChatIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-white">Ask {twin.name || "the twin"} anything</h2>
            <p className={`mt-0.5 text-sm ${theme.muted}`}>
              {creator.name}&apos;s AI twin — trained on every issue, answers with sources.
            </p>
          </div>
        </div>
        <Link
          href="/portal/twin"
          className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Chat with the twin
        </Link>
      </section>
    ),

    progress: (
      <section
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border ${theme.border} ${theme.card} p-6`}
      >
        <div className="flex items-center gap-4">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {level}
          </span>
          <div>
            <h2 className="font-bold text-white">Your progress</h2>
            <p className={`mt-0.5 text-sm ${theme.muted}`}>
              {gam.xp} XP · {gam.streak}-day streak · {gam.tokens} archive tokens
            </p>
          </div>
        </div>
        <Link
          href="/portal/progress"
          className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:opacity-80"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          Quests &amp; badges →
        </Link>
      </section>
    ),

    gallery:
      featured.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-white">Featured media</h2>
            <span className={`text-xs ${theme.faint}`}>From {creator.name}&apos;s studio</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featured.slice(0, 6).map((a) => {
              const src = `/api/media/${a.id}?v=${a.version ?? 0}`;
              return (
                <div
                  key={a.id}
                  className={`overflow-hidden rounded-2xl border ${theme.border} ${theme.card}`}
                >
                  {a.kind === "video" ? (
                    <video src={src} controls preload="metadata" className="aspect-video w-full" />
                  ) : a.kind === "audio" ? (
                    <div className="p-3">
                      <div className={`mb-2 text-[11px] font-semibold ${theme.muted}`}>Audio</div>
                      <audio src={src} controls className="h-9 w-full" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="Featured media" className="aspect-video w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null,
  };

  return (
    <div className="space-y-8">
      {renewDue && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div>
            <h3 className="font-bold text-white">Time to renew</h3>
            <p className={`mt-0.5 text-sm ${theme.muted}`}>
              Your progression: Level {level} · {gam.streak}-day streak · {gam.xp} XP — keep it
              going.
            </p>
          </div>
          <button
            onClick={() => void subscribe(member.tierId, member.provider ?? "stripe")}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            Renew (mock)
          </button>
        </section>
      )}

      {resolveSectionOrder(layout)
        .filter((id) => !(layout?.hidden ?? []).includes(id))
        .map((id) => (
          <Fragment key={id}>{sections[id]}</Fragment>
        ))}
    </div>
  );
}
