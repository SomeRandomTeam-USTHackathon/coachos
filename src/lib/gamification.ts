import type { BadgeId, GamConfig, GamificationState, Quest } from "./types";

export const DEFAULT_GAM_CONFIG: GamConfig = {
  xpReadIssue: 50,
  xpTwinQuestion: 10,
  xpDailyActive: 20,
  xpGhostListen: 30,
  enableStreaks: true,
  enableBadges: true,
  enableLeaderboard: true,
  enableTokens: true,
  enableQuests: true,
};

export const LEVEL_XP = 200;

export const XP_RULES = {
  dailyActive: 20,
  readIssue: 50,
  twinQuestion: 10,
  twinDailyXpCap: 50, // first 5 questions per day earn XP
};

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  return { level: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP, needed: LEVEL_XP };
}

export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export const QUESTS: Quest[] = [
  { id: "read-1", label: "Read 1 issue", target: 1, rewardXp: 30 },
  { id: "ask-3", label: "Ask the Twin 3 questions", target: 3, rewardXp: 40 },
  { id: "check-in", label: "Check in today (any activity)", target: 1, rewardXp: 20 },
];

export function questProgress(id: string, g: GamificationState): number {
  switch (id) {
    case "read-1":
      return g.daily.readCount;
    case "ask-3":
      return g.daily.twinQuestions;
    case "check-in":
      return g.lastActiveDate === dateKey() ? 1 : 0;
    default:
      return 0;
  }
}

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first-steps", name: "First Steps", description: "Complete your first issue" },
  { id: "curious-mind", name: "Curious Mind", description: "Ask the AI Twin your first question" },
  { id: "streak-3", name: "Hat Trick", description: "Hold a 3-day streak" },
  { id: "streak-7", name: "Week Warrior", description: "Hold a 7-day streak — earns an Archive Unlock Token" },
  { id: "xp-500", name: "Rising Star", description: "Bank 500 lifetime XP" },
  { id: "archive-diver", name: "Archive Diver", description: "Unlock an archive issue with a Token" },
];

export function evaluateBadges(g: GamificationState): BadgeId[] {
  const earned = new Set(g.badges);
  const fresh: BadgeId[] = [];
  const grant = (id: BadgeId, ok: boolean) => {
    if (ok && !earned.has(id)) {
      earned.add(id);
      fresh.push(id);
    }
  };
  grant("first-steps", g.completedIssueIds.length >= 1);
  grant("curious-mind", g.twinQuestionsTotal >= 1);
  grant("streak-3", g.streak >= 3);
  grant("streak-7", g.streak >= 7);
  grant("xp-500", g.xp >= 500);
  grant("archive-diver", g.unlockedArchiveIds.length >= 1);
  return fresh;
}

export interface GamToast {
  title: string;
  detail?: string;
}

export function emptyDaily(): GamificationState["daily"] {
  return { date: dateKey(), readCount: 0, twinQuestions: 0, claimed: [] };
}

export function freshDaily(g: GamificationState): GamificationState {
  return g.daily.date === dateKey() ? g : { ...g, daily: emptyDaily() };
}

export function initialGamification(): GamificationState {
  return {
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    activeDates: [],
    badges: [],
    tokens: 1, // one starter Token so the archive is explorable in the demo
    completedIssueIds: [],
    unlockedArchiveIds: [],
    twinQuestionsTotal: 0,
    daily: emptyDaily(),
  };
}

// Every gamification mutation funnels through here: rolls the daily quest
// window, applies the streak/daily check-in, runs the caller's change, then
// evaluates badges — returning the new state plus toasts to display.
// Pure function: the server applies it and persists the result.
// `cfg` carries the creator's gamification configuration (XP values + toggles).
export function applyActivity(
  gam: GamificationState,
  fn: (g: GamificationState) => { g: GamificationState; toasts?: GamToast[] },
  cfg: GamConfig = DEFAULT_GAM_CONFIG
): { gam: GamificationState; toasts: GamToast[] } {
  let g = freshDaily(gam);
  const today = dateKey();
  const toasts: GamToast[] = [];

  if (g.lastActiveDate !== today) {
    const nextStreak = cfg.enableStreaks
      ? g.lastActiveDate === yesterdayKey()
        ? g.streak + 1
        : 1
      : g.streak;
    g = {
      ...g,
      streak: nextStreak,
      lastActiveDate: today,
      activeDates: [...g.activeDates, today].slice(-90),
      xp: g.xp + cfg.xpDailyActive,
    };
    toasts.push({
      title: `+${cfg.xpDailyActive} XP`,
      detail:
        cfg.enableStreaks && nextStreak > 1
          ? `Daily check-in — ${nextStreak}-day streak`
          : "Daily check-in",
    });
  }

  const result = fn(g);
  g = result.g;
  toasts.push(...(result.toasts ?? []));

  if (cfg.enableBadges) {
    for (const badgeId of evaluateBadges(g)) {
      const def = BADGES.find((b) => b.id === badgeId);
      g = { ...g, badges: [...g.badges, badgeId] };
      toasts.push({ title: `Badge unlocked: ${def?.name ?? badgeId}`, detail: def?.description });
      if (badgeId === "streak-7" && cfg.enableTokens) {
        g = { ...g, tokens: g.tokens + 1 };
        toasts.push({ title: "+1 Archive Unlock Token", detail: "Reward for your 7-day streak" });
      }
    }
  }
  return { gam: g, toasts };
}

// ---- gamification depth (PRD 6.2.3) ----
// Pure, DB-free engine for streak freezes, streak repair, level-up perks and
// prestige. src/server/gamdepth.ts persists whatever these functions return.
// The engine is derivation-based — active_dates ∪ frozen_dates is ground
// truth — so it converges whether applyActivity's daily check-in (which cannot
// see the depth columns) ran before or after it.

export const MAX_STREAK_FREEZES = 2;
export const REPAIR_COST_XP = 50;
export const PRESTIGE_LEVEL = 10;
export const FREEZE_MILESTONE_DAYS = 7; // +1 freeze per 7-day streak milestone

// Cosmetic titles granted by the level-perks table (kind === "title").
export const MEMBER_TITLES = [
  "Momentum Maker",
  "Consistency Champ",
  "Fire Keeper",
  "Quiet Grinder",
  "Comeback Kid",
  "Deep Diver",
];

export interface LevelPerk {
  kind: "token" | "freeze" | "title";
  label: string; // human-facing reward text for the level-up modal
  title?: string; // set when kind === "title"
}

// Level-perks table: freezes at levels 3/6/9..., tokens at 4/7/10..., a
// cosmetic title otherwise (2/5/8..., cycling through MEMBER_TITLES).
export function perkForLevel(level: number): LevelPerk {
  if (level % 3 === 0) return { kind: "freeze", label: "+1 Streak Freeze" };
  if (level % 3 === 1) return { kind: "token", label: "+1 Archive Unlock Token" };
  const title = MEMBER_TITLES[Math.floor(level / 3) % MEMBER_TITLES.length];
  return { kind: "title", label: `Title: "${title}"`, title };
}

export function prevDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return dateKey(dt);
}

// Uncovered days between the member's last covered day and `today`, most
// recent first. Empty when yesterday is covered, or when no covered day exists
// behind the gap within the scan window (new member — no streak base to break).
export function gapBeforeToday(
  activeDates: string[],
  frozenDates: string[],
  today = dateKey()
): string[] {
  const covered = new Set([...activeDates, ...frozenDates]);
  const missed: string[] = [];
  let d = prevDayKey(today);
  for (let i = 0; i < 370; i++) {
    if (covered.has(d)) return missed;
    missed.push(d);
    d = prevDayKey(d);
  }
  return [];
}

// Length of the consecutive covered-day run ending at `endKey` (inclusive).
export function coveredRunLength(covered: Set<string>, endKey: string): number {
  let n = 0;
  let d = endKey;
  while (covered.has(d)) {
    n += 1;
    d = prevDayKey(d);
  }
  return n;
}

export interface DepthSnapshot {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  activeDates: string[];
  frozenDates: string[];
  streakFreezes: number;
  previousStreak: number | null;
  breakKey: string | null;
  prestigeCount: number;
  title: string | null;
  perkLevel: number; // highest level whose perk has been granted
  lastFreezeMilestone: number; // highest streak milestone already granted a freeze
  tokens: number;
}

export interface LevelUpGrant {
  level: number;
  perk: LevelPerk;
}

export interface DepthReconciled extends DepthSnapshot {
  toasts: GamToast[];
  levelUps: LevelUpGrant[];
  openGapDays: string[]; // coverable gap awaiting an explicit or automatic freeze
}

// Cover an open gap with held freezes: marks the days frozen, decrements the
// inventory, and bridges lastActiveDate to the most recent missed day so the
// next applyActivity check-in extends the streak instead of resetting it.
export function freezeGap(snap: DepthSnapshot, gap: string[]): DepthSnapshot {
  return {
    ...snap,
    frozenDates: [...snap.frozenDates, ...gap].slice(-90),
    streakFreezes: Math.max(0, snap.streakFreezes - gap.length),
    lastActiveDate: gap[0] ?? snap.lastActiveDate,
  };
}

function recordBreak(out: DepthReconciled, firstMissed: string, previousStreak: number): void {
  out.breakKey = firstMissed;
  out.previousStreak = previousStreak > 0 ? previousStreak : null;
  out.lastFreezeMilestone = 0;
  if (out.previousStreak !== null) {
    out.toasts.push({
      title: "Streak broken",
      detail: `Your ${out.previousStreak}-day streak ended — repair it from the progress page`,
    });
  }
}

// Idempotent read-time reconciliation. Detects missed-day gaps and either
// leaves them open for a freeze (enough held), auto-consumes freezes when a
// check-in already landed today, or records a repairable break (once, keyed
// by the first missed day). Then applies 7-day-milestone freeze grants and
// the level-perks table via the perkLevel watermark.
export function reconcileDepth(
  snap: DepthSnapshot,
  cfg: GamConfig = DEFAULT_GAM_CONFIG,
  today = dateKey()
): DepthReconciled {
  const out: DepthReconciled = {
    ...snap,
    activeDates: [...snap.activeDates],
    frozenDates: [...snap.frozenDates],
    toasts: [],
    levelUps: [],
    openGapDays: [],
  };

  let brokeNow = false;
  if (cfg.enableStreaks) {
    const covered = new Set([...out.activeDates, ...out.frozenDates]);
    const gap = gapBeforeToday(out.activeDates, out.frozenDates, today);
    if (gap.length > 0 && out.breakKey === null) {
      const firstMissed = gap[gap.length - 1];
      if (out.lastActiveDate === today) {
        // Today's check-in already ran through applyActivity, which resets the
        // streak on any gap because it cannot see the depth columns.
        const runLen = coveredRunLength(covered, prevDayKey(firstMissed));
        if (runLen > 0 && out.streakFreezes >= gap.length) {
          // Auto-consume: frozen missed days are streak-preserving; today's
          // check-in extends the run.
          Object.assign(out, freezeGap(out, gap));
          out.streak = runLen + 1;
          out.toasts.push({
            title: gap.length === 1 ? "Streak freeze used" : `${gap.length} streak freezes used`,
            detail: `${gap.length} missed day${gap.length === 1 ? "" : "s"} auto-covered — ${out.streakFreezes} left`,
          });
        } else if (runLen > 0) {
          recordBreak(out, firstMissed, runLen);
          brokeNow = true;
        }
      } else if (out.streak > 0) {
        // No check-in yet today: hold the gap open for an explicit freeze when
        // the inventory covers it, otherwise record the break right away.
        if (out.streakFreezes >= gap.length) {
          out.openGapDays = gap;
        } else {
          recordBreak(out, firstMissed, out.streak);
          brokeNow = true;
        }
      }
    }

    // 7-day streak milestones earn +1 freeze (inventory capped; skipped right
    // after a break because the stored streak value is about to reset).
    while (!brokeNow && out.streak >= out.lastFreezeMilestone + FREEZE_MILESTONE_DAYS) {
      out.lastFreezeMilestone += FREEZE_MILESTONE_DAYS;
      if (out.streakFreezes < MAX_STREAK_FREEZES) {
        out.streakFreezes += 1;
        out.toasts.push({
          title: "+1 Streak Freeze",
          detail: `${out.lastFreezeMilestone}-day streak milestone`,
        });
      } else {
        out.toasts.push({
          title: `${out.lastFreezeMilestone}-day streak milestone`,
          detail: `Freeze inventory full (max ${MAX_STREAK_FREEZES})`,
        });
      }
    }
  }

  // Level-perks table: grant every level crossed since the watermark.
  const lvl = levelFor(out.xp).level;
  while (out.perkLevel < lvl) {
    out.perkLevel += 1;
    const perk = perkForLevel(out.perkLevel);
    if (perk.kind === "token" && !cfg.enableTokens) continue;
    if (perk.kind === "freeze" && !cfg.enableStreaks) continue;
    if (perk.kind === "token") out.tokens += 1;
    else if (perk.kind === "freeze")
      out.streakFreezes = Math.min(MAX_STREAK_FREEZES, out.streakFreezes + 1);
    else if (perk.kind === "title" && perk.title) out.title = perk.title;
    out.levelUps.push({ level: out.perkLevel, perk });
  }

  return out;
}
