"use client";

import { useCallback, useEffect, useRef, useState, type SVGProps } from "react";
import { api } from "@/lib/api";
import { BADGES, dateKey, levelFor, questProgress, QUESTS } from "@/lib/gamification";
import { MEMBERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { ChatIcon, CheckIcon, FlameIcon, KeyIcon, StarIcon } from "@/components/icons";
import type { BadgeId, GamDepth, LevelUpNotice, RepairMethod } from "@/lib/types";

const BADGE_ICONS: Record<BadgeId, typeof FlameIcon> = {
  "first-steps": CheckIcon,
  "curious-mind": ChatIcon,
  "streak-3": FlameIcon,
  "streak-7": FlameIcon,
  "xp-500": StarIcon,
  "archive-diver": KeyIcon,
};

function SnowflakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 3v18M5 8l14 8M19 8l-14 8" />
      <path d="M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5" />
    </svg>
  );
}

interface LocalToast {
  id: number;
  title: string;
  detail?: string;
}

export default function ProgressPage() {
  const gam = useStore((s) => s.gam);
  const gamConfig = useStore((s) => s.gamConfig);
  const claimQuest = useStore((s) => s.claimQuest);

  // Depth state (freezes / repairs / prestige / level perks) comes from
  // GET /api/gam — bootstrap is owned by another wave, so this page fetches
  // its own source of truth and refetches after every action.
  const [depth, setDepth] = useState<GamDepth | null>(null);
  const [toasts, setToasts] = useState<LocalToast[]>([]);
  const [levelUps, setLevelUps] = useState<LevelUpNotice[]>([]);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const toastSeq = useRef(0);

  const pushToasts = useCallback((items: Array<{ title: string; detail?: string }>) => {
    if (items.length === 0) return;
    const stamped = items.map((t) => ({ ...t, id: ++toastSeq.current }));
    setToasts((s) => [...s, ...stamped]);
    for (const t of stamped) {
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 4200);
    }
  }, []);

  const applyDepth = useCallback(
    (d: GamDepth) => {
      setDepth(d);
      pushToasts(d.toasts);
      if (d.levelUps.length > 0) setLevelUps((q) => [...q, ...d.levelUps]);
    },
    [pushToasts]
  );

  const refresh = useCallback(async () => {
    applyDepth(await api<GamDepth>("/api/gam"));
  }, [applyDepth]);

  useEffect(() => {
    let cancelled = false;
    void api<GamDepth>("/api/gam").then((d) => {
      if (!cancelled) applyDepth(d);
    });
    return () => {
      cancelled = true;
    };
  }, [applyDepth]);

  const act = useCallback(
    async (key: string, body: { action: string; method?: RepairMethod }) => {
      setPending(key);
      try {
        applyDepth(await api<GamDepth>("/api/gam", body));
      } finally {
        setPending(null);
      }
    },
    [applyDepth]
  );

  const onClaim = useCallback(
    async (questId: string) => {
      await claimQuest(questId);
      await refresh();
    },
    [claimQuest, refresh]
  );

  // Live values: prefer the reconciled depth state, fall back to the store.
  const dg = depth?.gam ?? gam;
  const { level, into, needed } = levelFor(dg.xp);
  const streakFreezes = depth?.streakFreezes ?? 0;
  const maxFreezes = depth?.maxFreezes ?? 2;
  const prestigeCount = depth?.prestigeCount ?? 0;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return dateKey(d);
  });
  const activeSet = new Set(dg.activeDates);
  const frozenSet = new Set(depth?.frozenDates ?? []);

  const board = [
    ...MEMBERS.map((m) => ({ name: m.name, xp: m.weeklyXp, you: false })),
    { name: "You", xp: dg.xp, you: true },
  ].sort((a, b) => b.xp - a.xp);
  const yourRank = board.findIndex((r) => r.you) + 1;

  const broken = depth !== null && depth.previousStreak !== null;
  const openGap = depth !== null && depth.openGapDays.length > 0;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes gamToastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gamFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gamPopIn { 0% { opacity: 0; transform: scale(.72); } 60% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes gamGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); } 50% { box-shadow: 0 0 44px 8px rgba(251, 191, 36, .35); } }
        .gam-toast { animation: gamToastIn .25s ease-out; }
        .gam-overlay { animation: gamFadeIn .2s ease-out; }
        .gam-modal-card { animation: gamPopIn .35s cubic-bezier(.2, .9, .3, 1.2), gamGlow 2.2s ease-in-out 1s 2; }
      `}</style>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black text-white">Your Progress</h1>
        {depth?.title && (
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
            {depth.title}
          </span>
        )}
        {prestigeCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <StarIcon className="h-3.5 w-3.5" /> Prestige ×{prestigeCount}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#9a9ab0]">Level</div>
              <div className="text-4xl font-black text-white">{level}</div>
            </div>
            <StarIcon className="h-8 w-8 text-amber-300" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#26263a]">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${Math.round((into / needed) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-[#9a9ab0]">
            {into} / {needed} XP — {dg.xp} lifetime
          </div>
          <div className="mt-4">
            {depth?.canPrestige ? (
              <button
                onClick={() => setConfirmPrestige(true)}
                disabled={pending !== null}
                className="w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-[#1a1405] transition-colors hover:bg-amber-300 disabled:opacity-50"
              >
                Prestige — reset to level 1, wear the star
              </button>
            ) : (
              <div className="text-xs text-[#5a5a72]">
                Reach level {depth?.prestigeLevel ?? 10} to Prestige (you&apos;re level {level})
              </div>
            )}
          </div>
        </div>

        {gamConfig.enableStreaks && (
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#9a9ab0]">
                  Current streak{broken ? " — broken" : ""}
                </div>
                <div className={`text-4xl font-black ${broken ? "text-[#5a5a72]" : "text-white"}`}>
                  {dg.streak} days
                </div>
              </div>
              <FlameIcon className={`h-8 w-8 ${broken ? "text-[#5a5a72]" : "text-orange-400"}`} />
            </div>
            <div className="mt-4 flex gap-1.5">
              {days.map((dk) => (
                <span
                  key={dk}
                  title={frozenSet.has(dk) ? `${dk} (freeze-covered)` : dk}
                  className={`h-4 flex-1 rounded-sm ${
                    activeSet.has(dk)
                      ? "bg-orange-400"
                      : frozenSet.has(dk)
                        ? "bg-sky-400"
                        : "bg-[#26263a]"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-[#9a9ab0]">
              Last 14 days
              {frozenSet.size > 0 && " · blue days were covered by a streak freeze"}
              {gamConfig.enableTokens && !broken && " · hold a 7-day streak to earn an Archive Unlock Token"}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-300">
                <SnowflakeIcon className="h-3.5 w-3.5" />
                {streakFreezes}/{maxFreezes} freezes
              </span>
              <button
                onClick={() => void act("freeze", { action: "freeze" })}
                disabled={pending !== null || !depth?.canFreeze}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Freeze streak
              </button>
            </div>
            <div className="mt-1.5 text-xs text-[#5a5a72]">
              {openGap && depth
                ? `${depth.openGapDays.length} missed day${depth.openGapDays.length === 1 ? "" : "s"} to cover — freezes are also auto-used when you check in`
                : streakFreezes === 0
                  ? "No freezes held — earn +1 per 7-day streak milestone"
                  : "No missed days to cover"}
            </div>

            {broken && depth.previousStreak !== null && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                <div className="text-sm font-semibold text-white">
                  Streak broken — your {depth.previousStreak}-day streak ended
                  {depth.breakSince ? ` on ${depth.breakSince}` : ""}.
                </div>
                <div className="mt-1 text-xs text-[#9a9ab0]">
                  Repair it once, back to {depth.previousStreak} days:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => void act("repair", { action: "repair", method: "xp" })}
                    disabled={pending !== null || !depth.canRepairWithXp}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Repair · {depth.repairCostXp} XP
                  </button>
                  {gamConfig.enableTokens && (
                    <button
                      onClick={() => void act("repair", { action: "repair", method: "token" })}
                      disabled={pending !== null || !depth.canRepairWithToken}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Repair · 1 Token
                    </button>
                  )}
                </div>
                {!depth.canRepairWithXp && !depth.canRepairWithToken && (
                  <div className="mt-1.5 text-xs text-[#5a5a72]">
                    You need {depth.repairCostXp} XP or 1 Archive Unlock Token to repair.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {gamConfig.enableQuests && (
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <h2 className="font-bold text-white">Daily quests</h2>
          <div className="mt-4 space-y-3">
            {QUESTS.map((q) => {
              const p = Math.min(questProgress(q.id, dg), q.target);
              const done = p >= q.target;
              const claimed = dg.daily.claimed.includes(q.id);
              return (
                <div key={q.id} className="flex items-center gap-4 rounded-xl bg-[#10101c] p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{q.label}</div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#26263a]">
                      <div
                        className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-violet-500"}`}
                        style={{ width: `${(p / q.target) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[#9a9ab0]">
                    {p}/{q.target}
                  </span>
                  {claimed ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
                      <CheckIcon className="h-3.5 w-3.5" /> Claimed
                    </span>
                  ) : (
                    <button
                      onClick={() => void onClaim(q.id)}
                      disabled={!done || pending !== null}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +{q.rewardXp} XP
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gamConfig.enableBadges && (
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <h2 className="font-bold text-white">Badges</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((b) => {
              const earned = dg.badges.includes(b.id);
              const Icon = BADGE_ICONS[b.id];
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-4 ${
                    earned
                      ? "border-violet-500/40 bg-violet-500/5"
                      : "border-[#1d1d2e] bg-[#10101c] opacity-50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${earned ? "text-violet-300" : "text-[#5a5a72]"}`} />
                  <div className="mt-2 text-sm font-bold text-white">{b.name}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-[#9a9ab0]">{b.description}</div>
                </div>
              );
            })}
            {prestigeCount > 0 && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
                <StarIcon className="h-5 w-5 text-amber-300" />
                <div className="mt-2 text-sm font-bold text-white">Prestige ×{prestigeCount}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-[#9a9ab0]">
                  Reset to level 1 at level {depth?.prestigeLevel ?? 10} — worn permanently
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gamConfig.enableLeaderboard && (
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <h2 className="font-bold text-white">This week&apos;s cohort</h2>
          <div className="mt-1 text-xs text-[#9a9ab0]">
            You&apos;re #{yourRank} of {board.length} this week — cohort XP is a weekly snapshot;
            your row is live.
          </div>
          <div className="mt-4 space-y-1">
            {board.map((row, idx) => (
              <div
                key={row.name}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  row.you ? "border border-violet-500/50 bg-violet-500/10" : "bg-[#10101c]"
                }`}
              >
                <span
                  className={`w-6 text-center text-sm font-black ${
                    idx === 0 ? "text-amber-300" : idx < 3 ? "text-[#c3c3d6]" : "text-[#5a5a72]"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className={`flex-1 text-sm font-semibold ${row.you ? "text-violet-200" : "text-white"}`}>
                  {row.name}
                  {row.you && prestigeCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-amber-300">
                      <StarIcon className="h-3.5 w-3.5" />
                      <span className="text-xs font-bold">×{prestigeCount}</span>
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold text-amber-300">{row.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {levelUps.length > 0 && (
        <div
          className="gam-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setLevelUps((q) => q.slice(1))}
        >
          <div
            className="gam-modal-card w-full max-w-sm rounded-2xl border border-amber-400/50 bg-[#171726] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <StarIcon className="mx-auto h-10 w-10 text-amber-300" />
            <div className="mt-3 text-xl font-black text-white">Level {levelUps[0].level} unlocked</div>
            <div className="mt-1 text-sm font-semibold text-amber-300">— {levelUps[0].perkLabel}</div>
            {levelUps.length > 1 && (
              <div className="mt-1 text-xs text-[#9a9ab0]">+{levelUps.length - 1} more</div>
            )}
            <button
              onClick={() => setLevelUps((q) => q.slice(1))}
              className="mt-4 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-[#1a1405] transition-colors hover:bg-amber-300"
            >
              Nice!
            </button>
          </div>
        </div>
      )}

      {confirmPrestige && (
        <div className="gam-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#26263a] bg-[#171726] p-6">
            <div className="text-lg font-black text-white">Prestige?</div>
            <div className="mt-2 text-sm leading-relaxed text-[#9a9ab0]">
              You reset to level 1 with 0 XP and start earning level perks again. Your streak,
              badges, tokens and freezes stay — and the Prestige star shows permanently on this
              page and the leaderboard.
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmPrestige(false)}
                className="flex-1 rounded-lg border border-[#26263a] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d1d2e]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmPrestige(false);
                  void act("prestige", { action: "prestige" });
                }}
                className="flex-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-[#1a1405] transition-colors hover:bg-amber-300"
              >
                Prestige
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
            className="gam-toast pointer-events-auto rounded-xl border border-sky-400/40 bg-[#171726] p-3 text-left shadow-lg shadow-sky-950/50"
          >
            <span className="block text-sm font-semibold text-sky-300">{t.title}</span>
            {t.detail ? <span className="mt-0.5 block text-xs text-[#9a9ab0]">{t.detail}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
