export type Access = "free" | "member" | "archive";

export interface Season {
  id: string;
  title: string;
  month: string;
}

export interface Issue {
  id: string;
  seasonId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  body: string[];
  access: Access;
  publishedAt: string; // YYYY-MM-DD
  readMinutes: number;
}

export interface Creator {
  name: string;
  brand: string;
  tagline: string;
}

export interface TwinConfig {
  name: string;
  tone: string; // key into TONES in lib/twin.ts
  greeting: string;
  trainedIssueIds: string[];
  trainedAt: string | null;
  disclosure?: string | null;
}

export interface MockMember {
  id: string;
  name: string;
  weeklyXp: number;
}

export type BadgeId =
  | "first-steps"
  | "curious-mind"
  | "streak-3"
  | "streak-7"
  | "xp-500"
  | "archive-diver";

export interface Quest {
  id: string;
  label: string;
  target: number;
  rewardXp: number;
}

export interface DailyQuestProgress {
  date: string; // local date key
  readCount: number;
  twinQuestions: number;
  claimed: string[]; // quest ids claimed today
}

export interface GamificationState {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  activeDates: string[]; // date keys, most recent last
  badges: BadgeId[];
  tokens: number; // Archive Unlock Tokens
  completedIssueIds: string[];
  unlockedArchiveIds: string[];
  twinQuestionsTotal: number;
  daily: DailyQuestProgress;
}

export interface ChatMessage {
  id: string;
  role: "user" | "twin";
  text: string;
  source?: string;
  ts: number;
  // true = LLM answer passed cross-check; false = fell back to grounded template; null/undefined = mock mode
  verified?: boolean | null;
  // Top retrieved chunks behind this answer. In-memory only (not persisted in chat_messages),
  // so only messages from the current session carry it.
  sources?: ChatSource[];
}

// Training-only corpus for the AI twin — never shown as portal content.
export interface KnowledgeDoc {
  id: string;
  title: string;
  keyPoints: string[];
  body: string[];
  createdAt: string;
}

export type Currency = "USD" | "HKD";
export type PayProvider = "stripe" | "paypal" | "googlepay" | "octopus";

export interface Tier {
  id: string;
  name: string;
  priceCents: number;
  currency: Currency;
  perks: string[];
  position: number;
}

export interface OnboardingStep {
  id: string;
  label: string;
  position: number;
}

export interface MemberProfile {
  displayName: string | null;
  onboarded: boolean;
  tierId: string | null;
  provider: PayProvider | null;
  subscribedAt: string | null;
  completedStepIds: string[];
}

export type GhostStatus = "pending_coach" | "awaiting_member" | "done";

export interface GamConfig {
  xpReadIssue: number;
  xpTwinQuestion: number;
  xpDailyActive: number;
  xpGhostListen: number;
  enableStreaks: boolean;
  enableBadges: boolean;
  enableLeaderboard: boolean;
  enableTokens: boolean;
  enableQuests: boolean;
}

export interface CreatorProfile extends Creator {
  niche: string | null;
  audienceSize: string | null;
  planTier: string | null;
  seats: number | null;
  trialEndsAt: string | null;
  launched: boolean;
  accent: string | null;
  firstSubscriberAt: string | null;
  onboardingDone: boolean;
}

export interface MediaAsset {
  id: string;
  kind: string; // image | video | audio
  mime: string;
  size: number;
  durationSec: number | null;
  edits: string[];
  createdAt: string;
}

export interface GhostMemo {
  id: string;
  milestone: string;
  summary: string;
  status: GhostStatus;
  coachMediaId: string | null;
  replyMediaId: string | null;
  replySummary: string | null;
  followUpQueued: boolean;
  listened: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  channel: string;
  text: string;
  createdAt: string;
}

export interface Toast {
  id: number;
  title: string;
  detail?: string;
}

// ---- text/voice-driven media editor (PRD 6.1.1) ----

export interface EditPoint {
  id: string;
  op: "hum" | "filler" | "silence" | "trim" | "crop" | "caption" | "filter" | "enhance" | "legacy";
  label: string;
  atSec: number;
  durSec?: number;
}

// Merged into the MediaAsset declared above (append-only change).
export interface MediaAsset {
  editPoints?: EditPoint[];
  featured?: boolean;
  version?: number;
}

// One retrieved chunk cited as a source behind a twin answer.
export interface ChatSource {
  docId: string;
  title: string;
  snippet: string;
  score: number; // normalized relevance, 0-1
}

// List view of a knowledge doc for the studio knowledge manager (GET /api/knowledge).
export interface KnowledgeDocMeta {
  id: string;
  title: string;
  chars: number;
  createdAt: string;
  preview: string; // first ~160 chars
}

// ---- HITL review queue ----

export type ReviewStatus = "approved" | "edited" | "rejected";
export type ReviewAction = "approve" | "edit" | "reject";

// A twin chat answer the hallucination cross-checker flagged (verified = false),
// joined with the member question that produced it.
export interface ReviewItem {
  id: string;
  question: string;
  answer: string;
  source: string | null;
  ts: number;
  memberId: string;
  reviewed: boolean;
  reviewStatus: ReviewStatus | null;
  editedAnswer: string | null;
}

export interface ReviewQueueState {
  hitlEnabled: boolean;
  pendingCount: number;
  items: ReviewItem[];
}

// ---- portal customization studio (PRD 6.1.4) ----

export type PortalThemeId = "midnight" | "ember" | "abyss";

export type PortalSectionId = "hero" | "issues" | "twin" | "progress" | "ghost" | "gallery";

// Persisted as JSON on creators.portal_layout. `order`/`hidden` hold section ids;
// readers tolerate unknown ids (ignored) and missing ids (appended at the end).
export interface PortalLayout {
  order: string[];
  hidden: string[];
}

// Merged into the CreatorProfile declared above (append-only change).
export interface CreatorProfile {
  theme?: PortalThemeId | null;
  portalLayout?: PortalLayout | null;
}

// ---- creator analytics ----

export interface MrrSlice {
  currency: Currency;
  amountCents: number;
  subscribers: number;
}

export interface AnalyticsReport {
  generatedAt: string;
  subscribers: { total: number; active: number };
  mrr: MrrSlice[];
  commissionPct: number; // platform fee; creator keeps 100 - commissionPct
  engagement: { activeLast7d: number; totalXp: number };
  churnRisk: { count: number; names: string[] };
  ghost: { memosSent: number; replies: number; responseRate: number | null };
  heatmap: Array<{ date: string; count: number }>; // last 28 days, oldest first
}

// ---- gamification depth (PRD 6.2.3) ----

// One level-up grant produced by the depth engine (level-perks table lives in
// lib/gamification.ts). Surfaced as an animated modal on the progress page.
export interface LevelUpNotice {
  level: number;
  perkLabel: string;
}

export type RepairMethod = "xp" | "token";

// Live gamification-depth state served by GET/POST /api/gam. The progress page
// fetches it directly so bootstrap (owned elsewhere) stays untouched. `gam` is
// the freshly reconciled member_state projection; the rest comes from the
// depth columns added this wave (streak_freezes, previous_streak, ...).
export interface GamDepth {
  gam: GamificationState;
  streakFreezes: number;
  maxFreezes: number;
  frozenDates: string[]; // missed days covered by a freeze or a repair
  openGapDays: string[]; // uncovered missed days a held freeze could cover (most recent first)
  canFreeze: boolean; // openGapDays non-empty and enough freezes held
  previousStreak: number | null; // length of the broken streak awaiting repair
  breakSince: string | null; // first missed day of the unrepaired break
  canRepair: boolean; // a broken streak is on offer (previousStreak exceeds the live run)
  repairCostXp: number;
  canRepairWithXp: boolean;
  canRepairWithToken: boolean;
  prestigeCount: number;
  prestigeLevel: number; // level required to prestige
  canPrestige: boolean;
  title: string | null; // cosmetic title earned from the level-perks table
  toasts: Array<{ title: string; detail?: string }>; // engine events since the call
  levelUps: LevelUpNotice[]; // level perks granted by this call (show modals)
}
