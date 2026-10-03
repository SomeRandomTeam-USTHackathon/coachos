import {
  dateKey,
  FREEZE_MILESTONE_DAYS,
  freezeGap,
  gapBeforeToday,
  levelFor,
  MAX_STREAK_FREEZES,
  PRESTIGE_LEVEL,
  REPAIR_COST_XP,
  reconcileDepth,
  type DepthReconciled,
  type DepthSnapshot,
} from "@/lib/gamification";
import type { GamDepth, RepairMethod } from "@/lib/types";
import { getDb } from "./db";
import { createGhostMemo, getGam, getGamConfig, touch } from "./repo";

// Gamification-depth persistence (PRD 6.2.3). repo.ts stays append-only for
// other waves, so the depth columns (streak_freezes, previous_streak, ...) are
// read/written here. All rules live in lib/gamification.ts as pure functions;
// this module is IO plus a thin mapping to the GamDepth API payload.

interface DepthRow {
  xp: number;
  streak: number;
  last_active_date: string | null;
  active_dates: string;
  tokens: number;
  streak_freezes: number;
  previous_streak: number | null;
  break_key: string | null;
  prestige_count: number;
  frozen_dates: string;
  title: string | null;
  perk_level: number;
  last_freeze_milestone: number;
}

function depthRow(): DepthRow {
  return getDb().prepare("SELECT * FROM member_state WHERE id = 'you'").get() as DepthRow;
}

function parseDates(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function snapshotFrom(r: DepthRow): DepthSnapshot {
  return {
    xp: r.xp,
    streak: r.streak,
    lastActiveDate: r.last_active_date,
    activeDates: parseDates(r.active_dates),
    frozenDates: parseDates(r.frozen_dates),
    streakFreezes: r.streak_freezes,
    previousStreak: r.previous_streak,
    breakKey: r.break_key,
    prestigeCount: r.prestige_count,
    title: r.title,
    perkLevel: r.perk_level,
    lastFreezeMilestone: r.last_freeze_milestone,
    tokens: r.tokens,
  };
}

function persistDepth(s: DepthSnapshot): void {
  getDb()
    .prepare(
      `UPDATE member_state SET xp = ?, streak = ?, last_active_date = ?, streak_freezes = ?,
         previous_streak = ?, break_key = ?, frozen_dates = ?, title = ?, perk_level = ?,
         last_freeze_milestone = ?, tokens = ?
       WHERE id = 'you'`
    )
    .run(
      s.xp,
      s.streak,
      s.lastActiveDate,
      s.streakFreezes,
      s.previousStreak,
      s.breakKey,
      JSON.stringify(s.frozenDates),
      s.title,
      s.perkLevel,
      s.lastFreezeMilestone,
      s.tokens
    );
}

function toGamDepth(rec: DepthReconciled): GamDepth {
  const gam = getGam();
  // With an uncovered gap the stored streak is a dead run awaiting reset, so a
  // repair is offered whenever the broken streak exceeds the live one.
  const liveStreak = gapBeforeToday(gam.activeDates, rec.frozenDates).length > 0 ? 0 : gam.streak;
  const repairOffered = rec.previousStreak !== null && rec.previousStreak > liveStreak;
  return {
    gam,
    streakFreezes: rec.streakFreezes,
    maxFreezes: MAX_STREAK_FREEZES,
    frozenDates: rec.frozenDates,
    openGapDays: rec.openGapDays,
    canFreeze: rec.openGapDays.length > 0 && rec.streakFreezes >= rec.openGapDays.length,
    previousStreak: rec.previousStreak,
    breakSince: rec.breakKey,
    canRepair: repairOffered,
    repairCostXp: REPAIR_COST_XP,
    canRepairWithXp: repairOffered && gam.xp >= REPAIR_COST_XP,
    canRepairWithToken: repairOffered && gam.tokens >= 1,
    prestigeCount: rec.prestigeCount,
    prestigeLevel: PRESTIGE_LEVEL,
    canPrestige: levelFor(gam.xp).level >= PRESTIGE_LEVEL,
    title: rec.title,
    toasts: rec.toasts,
    levelUps: rec.levelUps.map((u) => ({ level: u.level, perkLabel: u.perk.label })),
  };
}

function reconcileNow(): DepthReconciled {
  return reconcileDepth(snapshotFrom(depthRow()), getGamConfig());
}

export function getGamDepth(): GamDepth {
  const rec = reconcileNow();
  persistDepth(rec);
  return toGamDepth(rec);
}

// "Freeze streak" button: cover the current open gap with held freezes. The
// same covering happens automatically when a check-in lands before the button
// is used (see reconcileDepth), so this is idempotent.
export function freezeStreak(): GamDepth {
  const rec = reconcileNow();
  if (rec.openGapDays.length === 0 || rec.streakFreezes < rec.openGapDays.length) {
    persistDepth(rec);
    return toGamDepth(rec);
  }
  const gap = rec.openGapDays;
  const frozen = freezeGap(rec, gap);
  const left = frozen.streakFreezes;
  const next: DepthReconciled = {
    ...rec,
    ...frozen,
    toasts: [
      ...rec.toasts,
      {
        title: "Streak frozen",
        detail: `${gap.length} missed day${gap.length === 1 ? "" : "s"} covered — ${left} freeze${left === 1 ? "" : "s"} left`,
      },
    ],
    levelUps: rec.levelUps,
    openGapDays: [],
  };
  persistDepth(next);
  return toGamDepth(next);
}

// Repair a broken streak: costs 50 XP or 1 Archive Unlock Token (member picks
// when both are payable), restores the streak to its previous length, and
// covers the gap days so the same break can never be repaired twice.
export function repairStreak(method: RepairMethod): GamDepth {
  const rec = reconcileNow();
  const liveStreak = gapBeforeToday(rec.activeDates, rec.frozenDates).length > 0 ? 0 : rec.streak;
  const offered = rec.previousStreak !== null && rec.previousStreak > liveStreak;
  const payable = method === "xp" ? rec.xp >= REPAIR_COST_XP : rec.tokens >= 1;
  if (!offered || !payable || rec.previousStreak === null) {
    persistDepth(rec);
    return toGamDepth(rec);
  }
  const restored = rec.previousStreak;
  // Today's check-in runs through the standard engine (XP/quests stay honest),
  // then the restored streak overwrites whatever applyActivity wrote.
  const after = touch();
  const gap = gapBeforeToday(after.gam.activeDates, rec.frozenDates);
  const next: DepthReconciled = {
    ...rec,
    xp: method === "xp" ? after.gam.xp - REPAIR_COST_XP : after.gam.xp,
    streak: restored,
    lastActiveDate: after.gam.lastActiveDate ?? dateKey(),
    activeDates: after.gam.activeDates,
    tokens: method === "token" ? rec.tokens - 1 : rec.tokens,
    frozenDates: [...rec.frozenDates, ...gap].slice(-90),
    previousStreak: null,
    breakKey: null,
    lastFreezeMilestone: Math.floor(restored / FREEZE_MILESTONE_DAYS) * FREEZE_MILESTONE_DAYS,
    toasts: [
      ...rec.toasts,
      ...after.toasts,
      {
        title: "Streak repaired",
        detail: `Back to ${restored} days — ${method === "xp" ? `${REPAIR_COST_XP} XP spent` : "1 Archive Unlock Token spent"}`,
      },
    ],
    levelUps: rec.levelUps,
    openGapDays: [],
  };
  persistDepth(next);
  return toGamDepth(next);
}

// Prestige lite: at level 10+ the member resets to level 1 / 0 XP and gains a
// permanent Prestige star. Streak, badges, tokens, freezes and title carry on.
export async function prestigeMember(): Promise<GamDepth> {
  const rec = reconcileNow();
  const lvl = levelFor(rec.xp).level;
  if (lvl < PRESTIGE_LEVEL) {
    persistDepth(rec);
    return toGamDepth(rec);
  }
  const count = rec.prestigeCount + 1;
  const next: DepthReconciled = {
    ...rec,
    xp: 0,
    perkLevel: 1, // perks re-earnable on the new run
    prestigeCount: count,
    toasts: [
      ...rec.toasts,
      {
        title: `Prestige ${count} achieved`,
        detail: "Level reset to 1 — the Prestige star is yours permanently",
      },
    ],
    levelUps: rec.levelUps,
    openGapDays: rec.openGapDays,
  };
  persistDepth(next);
  const depth = toGamDepth(next);
  await createGhostMemo(`Prestiged at level ${lvl} — now Prestige ${count}`);
  return depth;
}
