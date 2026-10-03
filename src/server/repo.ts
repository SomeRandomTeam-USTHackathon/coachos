import {
  applyActivity,
  dateKey,
  DEFAULT_GAM_CONFIG,
  freshDaily,
  levelFor,
  questProgress,
  QUESTS,
  XP_RULES,
  type GamToast,
} from "@/lib/gamification";
import {
  answer,
  buildChunks,
  detectSensitive,
  detectToneNote,
  retrieve,
  toSources,
  TONES,
  type CorpusDoc,
} from "@/lib/twin";
import type {
  Access,
  AnalyticsReport,
  AppNotification,
  ChatMessage,
  ChatSource,
  CreatorProfile,
  Currency,
  GamConfig,
  GamificationState,
  GhostMemo,
  Issue,
  KnowledgeDoc,
  MediaAsset,
  MemberProfile,
  OnboardingStep,
  PayProvider,
  ReviewAction,
  ReviewItem,
  ReviewQueueState,
  ReviewStatus,
  Season,
  Tier,
  TwinConfig,
} from "@/lib/types";
import { aiComplete, getSetting, isAiConfigured, setSetting } from "./ai";
import { getDb, resetDb } from "./db";
import { deleteObject, getObject, processAudio, putObject } from "./storage";
import type { EditPoint } from "@/lib/types";
import type { PortalLayout, PortalThemeId } from "@/lib/types";
import { isPortalThemeId, normalizeLayout } from "@/lib/portal";

export interface TwinStats {
  issues: number;
  knowledge: number;
  chunks: number;
}

export interface Bootstrap {
  creator: CreatorProfile;
  seasons: Season[];
  issues: Issue[];
  twin: TwinConfig;
  chat: ChatMessage[];
  gam: GamificationState;
  subscribed: boolean;
  knowledge: Array<{ id: string; title: string }>;
  twinStats: TwinStats;
  member: MemberProfile;
  tiers: Tier[];
  onboardingSteps: OnboardingStep[];
  ai: { configured: boolean; model: string };
  ghostMemos: GhostMemo[];
  notifications: AppNotification[];
  assets: MediaAsset[];
  gamConfig: GamConfig;
}

export interface GamResult {
  gam: GamificationState;
  toasts: GamToast[];
}

export interface TwinChatResult extends GamResult {
  userMsg: ChatMessage;
  twinMsg: ChatMessage;
}

export interface PublishInput {
  seasonId: string; // existing id, "current", or "new"
  newSeasonTitle?: string;
  title: string;
  summary: string;
  keyPoints: string[];
  body: string[];
  access: Access;
  readMinutes: number;
}

function newId(prefix: string): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---- row mappers ----

interface IssueRow {
  id: string;
  season_id: string;
  title: string;
  summary: string;
  key_points: string;
  body: string;
  access: Access;
  published_at: string;
  read_minutes: number;
}

function mapIssue(r: IssueRow): Issue {
  return {
    id: r.id,
    seasonId: r.season_id,
    title: r.title,
    summary: r.summary,
    keyPoints: JSON.parse(r.key_points) as string[],
    body: JSON.parse(r.body) as string[],
    access: r.access,
    publishedAt: r.published_at,
    readMinutes: r.read_minutes,
  };
}

interface KnowledgeRow {
  id: string;
  title: string;
  key_points: string;
  body: string;
  created_at: string;
}

function mapKnowledge(r: KnowledgeRow): KnowledgeDoc {
  return {
    id: r.id,
    title: r.title,
    keyPoints: JSON.parse(r.key_points) as string[],
    body: JSON.parse(r.body) as string[],
    createdAt: r.created_at,
  };
}

interface TierRow {
  id: string;
  name: string;
  price_cents: number;
  currency: Currency;
  perks: string;
  position: number;
}

function mapTier(r: TierRow): Tier {
  return {
    id: r.id,
    name: r.name,
    priceCents: r.price_cents,
    currency: r.currency,
    perks: JSON.parse(r.perks) as string[],
    position: r.position,
  };
}

interface GhostRow {
  id: string;
  milestone: string;
  summary: string;
  status: GhostMemo["status"];
  coach_media_id: string | null;
  reply_media_id: string | null;
  reply_summary: string | null;
  follow_up_queued: number;
  listened: number;
  created_at: string;
  updated_at: string;
}

function mapGhost(r: GhostRow): GhostMemo {
  return {
    id: r.id,
    milestone: r.milestone,
    summary: r.summary,
    status: r.status,
    coachMediaId: r.coach_media_id,
    replyMediaId: r.reply_media_id,
    replySummary: r.reply_summary,
    followUpQueued: r.follow_up_queued === 1,
    listened: r.listened === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface MediaRow {
  id: string;
  kind: string;
  mime: string;
  size: number;
  duration_sec: number | null;
  edits: string;
  created_at: string;
}

function mapAsset(r: MediaRow): MediaAsset {
  return {
    id: r.id,
    kind: r.kind,
    mime: r.mime,
    size: r.size,
    durationSec: r.duration_sec,
    edits: JSON.parse(r.edits) as string[],
    createdAt: r.created_at,
  };
}

interface CreatorRow {
  name: string;
  brand: string;
  tagline: string;
  niche: string | null;
  audience_size: string | null;
  plan_tier: string | null;
  seats: number | null;
  trial_ends_at: string | null;
  launched: number;
  accent: string | null;
  first_subscriber_at: string | null;
  onboarding_done: number;
  // portal customization studio (PRD 6.1.4) — optional until the idempotent
  // ALTER in the appended section at the end of this file has run.
  theme?: string | null;
  portal_layout?: string | null;
}

function mapCreator(r: CreatorRow): CreatorProfile {
  return {
    name: r.name,
    brand: r.brand,
    tagline: r.tagline,
    niche: r.niche,
    audienceSize: r.audience_size,
    planTier: r.plan_tier,
    seats: r.seats,
    trialEndsAt: r.trial_ends_at,
    launched: r.launched === 1,
    accent: r.accent,
    firstSubscriberAt: r.first_subscriber_at,
    onboardingDone: r.onboarding_done === 1,
    theme: isPortalThemeId(r.theme) ? r.theme : null,
    portalLayout: parsePortalLayoutRow(r.portal_layout),
  };
}

// ---- reads ----

export function listSeasons(): Season[] {
  return getDb().prepare("SELECT id, title, month FROM seasons ORDER BY position").all() as Season[];
}

export function listIssues(): Issue[] {
  const rows = getDb().prepare("SELECT * FROM issues ORDER BY published_at, id").all() as IssueRow[];
  return rows.map(mapIssue);
}

export function listKnowledge(): KnowledgeDoc[] {
  const rows = getDb().prepare("SELECT * FROM knowledge_docs ORDER BY created_at, id").all() as KnowledgeRow[];
  return rows.map(mapKnowledge);
}

export function listTiers(): Tier[] {
  const rows = getDb().prepare("SELECT * FROM tiers ORDER BY position").all() as TierRow[];
  return rows.map(mapTier);
}

export function listOnboardingSteps(): OnboardingStep[] {
  return getDb()
    .prepare("SELECT id, label, position FROM onboarding_steps ORDER BY position")
    .all() as OnboardingStep[];
}

export function listAssets(): MediaAsset[] {
  const rows = getDb()
    .prepare("SELECT * FROM media WHERE kind IN ('image', 'video', 'audio') ORDER BY created_at DESC")
    .all() as MediaRow[];
  return rows.map(mapAsset);
}

export function getCreator(): CreatorProfile {
  const r = getDb().prepare("SELECT * FROM creators WHERE id = 'alex'").get() as CreatorRow;
  return mapCreator(r);
}

export function getTwin(): TwinConfig {
  const r = getDb()
    .prepare("SELECT name, tone, greeting, trained_issue_ids, trained_at, disclosure FROM twin_config WHERE id = 1")
    .get() as {
    name: string;
    tone: string;
    greeting: string;
    trained_issue_ids: string;
    trained_at: string | null;
    disclosure: string | null;
  };
  return {
    name: r.name,
    tone: r.tone,
    greeting: r.greeting,
    trainedIssueIds: JSON.parse(r.trained_issue_ids) as string[],
    trainedAt: r.trained_at,
    disclosure: r.disclosure,
  };
}

interface ChatRow {
  id: string;
  role: ChatMessage["role"];
  text: string;
  source: string | null;
  ts: number;
  verified: number | null;
  review_status: string | null;
  edited_answer: string | null;
}

function mapChat(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    role: r.role,
    // Creator-corrected answers (HITL review queue) replace the original text.
    text: r.review_status === "edited" && r.edited_answer ? r.edited_answer : r.text,
    source: r.source ?? undefined,
    ts: r.ts,
    verified: r.verified === null ? null : r.verified === 1,
  };
}

export function listChat(): ChatMessage[] {
  const rows = getDb()
    .prepare("SELECT id, role, text, source, ts, verified, review_status, edited_answer FROM chat_messages ORDER BY ts, id")
    .all() as ChatRow[];
  return rows.map(mapChat);
}

function buildCorpus(): CorpusDoc[] {
  const twin = getTwin();
  const fromIssues = listIssues()
    .filter((i) => twin.trainedIssueIds.includes(i.id))
    .map((i) => ({ id: i.id, title: i.title, keyPoints: i.keyPoints, body: i.body }));
  const fromKnowledge = listKnowledge().map((k) => ({
    id: k.id,
    title: k.title,
    keyPoints: k.keyPoints,
    body: k.body,
  }));
  return [...fromIssues, ...fromKnowledge];
}

interface MemberRow {
  subscribed: number;
  xp: number;
  streak: number;
  last_active_date: string | null;
  active_dates: string;
  badges: string;
  tokens: number;
  completed_issue_ids: string;
  unlocked_archive_ids: string;
  twin_questions_total: number;
  daily: string;
  tier_id: string | null;
  provider: PayProvider | null;
  subscribed_at: string | null;
  display_name: string | null;
  onboarded: number;
  completed_step_ids: string;
}

function memberRow(): MemberRow {
  return getDb().prepare("SELECT * FROM member_state WHERE id = 'you'").get() as MemberRow;
}

export function getMemberProfile(): MemberProfile {
  const r = memberRow();
  return {
    displayName: r.display_name,
    onboarded: r.onboarded === 1,
    tierId: r.tier_id,
    provider: r.provider,
    subscribedAt: r.subscribed_at,
    completedStepIds: JSON.parse(r.completed_step_ids) as string[],
  };
}

export function getGam(): GamificationState {
  const r = memberRow();
  return {
    xp: r.xp,
    streak: r.streak,
    lastActiveDate: r.last_active_date,
    activeDates: JSON.parse(r.active_dates) as string[],
    badges: JSON.parse(r.badges) as GamificationState["badges"],
    tokens: r.tokens,
    completedIssueIds: JSON.parse(r.completed_issue_ids) as string[],
    unlockedArchiveIds: JSON.parse(r.unlocked_archive_ids) as string[],
    twinQuestionsTotal: r.twin_questions_total,
    daily: JSON.parse(r.daily) as GamificationState["daily"],
  };
}

function saveGam(g: GamificationState): void {
  getDb()
    .prepare(
      `UPDATE member_state SET xp = ?, streak = ?, last_active_date = ?, active_dates = ?,
         badges = ?, tokens = ?, completed_issue_ids = ?, unlocked_archive_ids = ?,
         twin_questions_total = ?, daily = ?
       WHERE id = 'you'`
    )
    .run(
      g.xp,
      g.streak,
      g.lastActiveDate,
      JSON.stringify(g.activeDates),
      JSON.stringify(g.badges),
      g.tokens,
      JSON.stringify(g.completedIssueIds),
      JSON.stringify(g.unlockedArchiveIds),
      g.twinQuestionsTotal,
      JSON.stringify(g.daily)
    );
}

export function getGamConfig(): GamConfig {
  const raw = getSetting("gam_config");
  if (!raw) return DEFAULT_GAM_CONFIG;
  try {
    return { ...DEFAULT_GAM_CONFIG, ...(JSON.parse(raw) as Partial<GamConfig>) };
  } catch {
    return DEFAULT_GAM_CONFIG;
  }
}

export function saveGamConfig(partial: Partial<GamConfig>): GamConfig {
  const next = { ...getGamConfig(), ...partial };
  setSetting("gam_config", JSON.stringify(next));
  return next;
}

function applyAndSave(
  fn: (g: GamificationState) => { g: GamificationState; toasts?: GamToast[] }
): GamResult {
  const { gam, toasts } = applyActivity(getGam(), fn, getGamConfig());
  saveGam(gam);
  return { gam, toasts };
}

export function isSubscribed(): boolean {
  return memberRow().subscribed === 1;
}

export function listGhostMemos(): GhostMemo[] {
  const rows = getDb().prepare("SELECT * FROM ghost_memos ORDER BY created_at DESC, id DESC").all() as GhostRow[];
  return rows.map(mapGhost);
}

export function listNotifications(limit = 20): AppNotification[] {
  return getDb()
    .prepare("SELECT id, channel, text, created_at FROM notifications ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as AppNotification[];
}

export function getBootstrap(): Bootstrap {
  // Ensures the creators theme/portal_layout columns exist before getCreator's
  // SELECT * (idempotent; declared in the appended section at the end).
  ensurePortalCustomizeSchema();
  // Backfill: an existing subscription counts as the first paying subscriber.
  const member = getMemberProfile();
  const creatorRow = getCreator();
  let firstSubscriberAt = creatorRow.firstSubscriberAt;
  if (member.subscribedAt && !firstSubscriberAt) {
    firstSubscriberAt = member.subscribedAt;
    getDb()
      .prepare("UPDATE creators SET first_subscriber_at = ? WHERE id = 'alex'")
      .run(firstSubscriberAt);
  }

  const twin = getTwin();
  const corpus = buildCorpus();
  const knowledge = listKnowledge();
  return {
    creator: { ...creatorRow, firstSubscriberAt },
    seasons: listSeasons(),
    issues: listIssues(),
    twin,
    chat: listChat(),
    gam: getGam(),
    subscribed: isSubscribed(),
    knowledge: knowledge.map((k) => ({ id: k.id, title: k.title })),
    twinStats: {
      issues: twin.trainedIssueIds.length,
      knowledge: knowledge.length,
      chunks: buildChunks(corpus).length,
    },
    member,
    tiers: listTiers(),
    onboardingSteps: listOnboardingSteps(),
    ai: { configured: isAiConfigured(), model: getSetting("openrouter_model") ?? "openai/gpt-4o-mini" },
    ghostMemos: listGhostMemos(),
    notifications: listNotifications(),
    assets: listAssets(),
    gamConfig: getGamConfig(),
  };
}

// ---- writes ----

export function publishIssue(input: PublishInput): { issue: Issue; newSeason?: Season } {
  const db = getDb();
  let newSeason: Season | undefined;
  let seasonId = input.seasonId;

  if (seasonId === "new") {
    const maxPos =
      (db.prepare("SELECT MAX(position) AS p FROM seasons").get() as { p: number | null }).p ?? -1;
    newSeason = {
      id: newId("s"),
      title:
        input.newSeasonTitle?.trim() ||
        `Season ${(db.prepare("SELECT COUNT(*) AS c FROM seasons").get() as { c: number }).c + 1}`,
      month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
    db.prepare("INSERT INTO seasons (id, title, month, position) VALUES (?, ?, ?, ?)").run(
      newSeason.id,
      newSeason.title,
      newSeason.month,
      maxPos + 1
    );
    seasonId = newSeason.id;
  } else if (seasonId === "current") {
    const seasons = listSeasons();
    seasonId = seasons[seasons.length - 1].id;
  }

  const issue: Issue = {
    id: newId("i"),
    seasonId,
    title: input.title.trim() || "Untitled Issue",
    summary: input.summary.trim(),
    keyPoints: input.keyPoints.map((k) => k.trim()).filter(Boolean),
    body: input.body,
    access: input.access,
    publishedAt: dateKey(),
    readMinutes: input.readMinutes,
  };
  db.prepare(
    `INSERT INTO issues (id, season_id, title, summary, key_points, body, access, published_at, read_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    issue.id,
    issue.seasonId,
    issue.title,
    issue.summary,
    JSON.stringify(issue.keyPoints),
    JSON.stringify(issue.body),
    issue.access,
    issue.publishedAt,
    issue.readMinutes
  );
  return { issue, newSeason };
}

export function insertKnowledge(input: {
  title: string;
  keyPoints: string[];
  body: string[];
}): KnowledgeDoc {
  const doc: KnowledgeDoc = {
    id: newId("k"),
    title: input.title.trim() || "Untitled document",
    keyPoints: input.keyPoints.map((k) => k.trim()).filter(Boolean),
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO knowledge_docs (id, title, key_points, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(doc.id, doc.title, JSON.stringify(doc.keyPoints), JSON.stringify(doc.body), doc.createdAt);
  return doc;
}

export function saveTwinPersona(cfg: {
  name: string;
  tone: string;
  greeting: string;
  disclosure?: string;
}): TwinConfig {
  if (cfg.disclosure !== undefined) {
    getDb()
      .prepare("UPDATE twin_config SET name = ?, tone = ?, greeting = ?, disclosure = ? WHERE id = 1")
      .run(cfg.name, cfg.tone, cfg.greeting, cfg.disclosure);
  } else {
    getDb()
      .prepare("UPDATE twin_config SET name = ?, tone = ?, greeting = ? WHERE id = 1")
      .run(cfg.name, cfg.tone, cfg.greeting);
  }
  return getTwin();
}

export function trainTwin(): { twin: TwinConfig; chunks: number } {
  const issues = listIssues();
  const trainedIssueIds = issues.map((i) => i.id);
  getDb()
    .prepare("UPDATE twin_config SET trained_issue_ids = ?, trained_at = ? WHERE id = 1")
    .run(JSON.stringify(trainedIssueIds), new Date().toISOString());
  return { twin: getTwin(), chunks: buildChunks(buildCorpus()).length };
}

function insertChat(msg: ChatMessage): void {
  getDb()
    .prepare("INSERT INTO chat_messages (id, role, text, source, ts, verified) VALUES (?, ?, ?, ?, ?, ?)")
    .run(
      msg.id,
      msg.role,
      msg.text,
      msg.source ?? null,
      msg.ts,
      msg.verified === undefined || msg.verified === null ? null : msg.verified ? 1 : 0
    );
}

export async function twinChat(text: string): Promise<TwinChatResult> {
  const corpus = buildCorpus();
  const twin = getTwin();
  const cfg = getGamConfig();

  let ansText: string | null = null;
  let source: string | undefined;
  let verified: boolean | null = null;
  let sources: ChatSource[] = [];

  // Emotional-tone memory: a one-line read on the subscriber's recent messages.
  const toneNote = detectToneNote(
    listChat()
      .filter((m) => m.role === "user")
      .slice(-6)
      .map((m) => m.text)
  );

  // Sensitive-topic handoff: deflect with care and flag it for the creator via
  // the notifications log (surfaces in the studio notification feed).
  const sensitive = detectSensitive(text);
  if (sensitive) {
    const creator = getCreator();
    ansText =
      `I'm really glad you felt comfortable sharing that, and I want you to have proper support here. ` +
      `This one's for ${creator.name} — I've flagged it for human follow-up, so expect a personal reply. ` +
      `If it's urgent, please contact local emergency services or a qualified professional right away.`;
    verified = null;
    insertNotification(
      "flag",
      `Flagged for coach — sensitive topic (${sensitive}). Member asked: "${text.slice(0, 140)}${text.length > 140 ? "…" : ""}". The twin deflected; human follow-up recommended.`
    );
  } else {
    const top = retrieve(text, corpus, 5);
    sources = toSources(top, 3);
    if (top.length > 0 && isAiConfigured()) {
      const excerpts = top
        .map((s, i) => `[${i + 1}] From "${s.chunk.docTitle}": ${s.chunk.text}`)
        .join("\n");
      const toneLabel = TONES[twin.tone]?.label ?? twin.tone;
      const toneLine = toneNote
        ? `Tone so far: the subscriber seems ${toneNote}. You may acknowledge that in a few words at most, without mentioning this note.\n\n`
        : "";
      const draft = await aiComplete(
        `${toneLine}You are ${twin.name}, the AI twin of a coach. Persona/tone: ${toneLabel}. Answer the member's question in 2-4 sentences using ONLY the excerpts below. If they don't cover the question, say so honestly instead of inventing facts.`,
        `Excerpts:\n${excerpts}\n\nMember question: ${text}`
      );
      if (draft) {
        // Cross-checker: hallucination guard — the draft must be fully grounded in the excerpts.
        const check = await aiComplete(
          "You are a strict fact checker. Answer with exactly YES or NO. YES only if every factual claim in ANSWER is directly supported by EXCERPTS.",
          `EXCERPTS:\n${excerpts}\n\nANSWER:\n${draft}`,
          { maxTokens: 8, temperature: 0 }
        );
        if (check?.trim().toUpperCase().startsWith("YES")) {
          ansText = draft;
          source = top[0].chunk.docTitle;
          verified = true;
        } else {
          verified = false;
        }
      }
    }

    if (!ansText) {
      const mock = answer(text, corpus, twin, { toneNote });
      ansText = mock.text;
      source = mock.source;
    }
  }

  const now = Date.now();
  const userMsg: ChatMessage = { id: newId("c"), role: "user", text, ts: now };
  const twinMsg: ChatMessage = {
    id: newId("c"),
    role: "twin",
    text: ansText,
    source,
    ts: now + 1,
    verified,
    sources,
  };
  insertChat(userMsg);
  insertChat(twinMsg);

  const { gam, toasts } = applyAndSave((g) => {
    const asked = g.daily.twinQuestions;
    const earns = asked * XP_RULES.twinQuestion < XP_RULES.twinDailyXpCap;
    return {
      g: {
        ...g,
        twinQuestionsTotal: g.twinQuestionsTotal + 1,
        xp: g.xp + (earns ? cfg.xpTwinQuestion : 0),
        daily: { ...g.daily, twinQuestions: asked + 1 },
      },
      toasts: earns ? [{ title: `+${cfg.xpTwinQuestion} XP`, detail: "Twin question" }] : [],
    };
  });
  return { userMsg, twinMsg, gam, toasts };
}

export function touch(): GamResult {
  return applyAndSave((g) => ({ g }));
}

export async function completeIssue(issueId: string): Promise<GamResult> {
  const current = getGam();
  if (current.completedIssueIds.includes(issueId)) {
    return { gam: current, toasts: [] };
  }
  const issue = getDb().prepare("SELECT title FROM issues WHERE id = ?").get(issueId) as
    | { title: string }
    | undefined;
  const cfg = getGamConfig();
  const lvlBefore = levelFor(current.xp).level;
  const result = applyAndSave((g) => ({
    g: {
      ...g,
      xp: g.xp + cfg.xpReadIssue,
      completedIssueIds: [...g.completedIssueIds, issueId],
      daily: { ...g.daily, readCount: g.daily.readCount + 1 },
    },
    toasts: [{ title: `+${cfg.xpReadIssue} XP`, detail: "Issue completed" }],
  }));
  // Ghost Coaching triggers: issue completion + level-ups create a memo for the coach.
  await createGhostMemo(`Completed the issue "${issue?.title ?? issueId}"`);
  const lvlAfter = levelFor(result.gam.xp).level;
  if (lvlAfter > lvlBefore) {
    await createGhostMemo(`Reached level ${lvlAfter}`);
  }
  return result;
}

export function claimQuest(questId: string): GamResult {
  const quest = QUESTS.find((q) => q.id === questId);
  const current = getGam();
  if (!quest) return { gam: current, toasts: [] };
  const fresh = freshDaily(current);
  if (fresh.daily.claimed.includes(questId) || questProgress(questId, fresh) < quest.target) {
    return { gam: current, toasts: [] };
  }
  return applyAndSave((g) => ({
    g: {
      ...g,
      xp: g.xp + quest.rewardXp,
      daily: { ...g.daily, claimed: [...g.daily.claimed, questId] },
    },
    toasts: [{ title: `+${quest.rewardXp} XP`, detail: `Quest: ${quest.label}` }],
  }));
}

export function unlockArchive(issueId: string): GamResult {
  const current = getGam();
  if (current.tokens < 1 || current.unlockedArchiveIds.includes(issueId)) {
    return { gam: current, toasts: [] };
  }
  return applyAndSave((g) => ({
    g: {
      ...g,
      tokens: g.tokens - 1,
      unlockedArchiveIds: [...g.unlockedArchiveIds, issueId],
    },
    toasts: [{ title: "Archive unlocked", detail: "1 Archive Unlock Token spent" }],
  }));
}

// ---- payments ----

export function createTier(input: {
  name: string;
  priceCents: number;
  currency: Currency;
  perks: string[];
}): Tier {
  const maxPos =
    (getDb().prepare("SELECT MAX(position) AS p FROM tiers").get() as { p: number | null }).p ?? -1;
  const tier: Tier = {
    id: newId("t"),
    name: input.name.trim() || "Untitled tier",
    priceCents: input.priceCents,
    currency: input.currency,
    perks: input.perks,
    position: maxPos + 1,
  };
  getDb()
    .prepare("INSERT INTO tiers (id, name, price_cents, currency, perks, position) VALUES (?, ?, ?, ?, ?, ?)")
    .run(tier.id, tier.name, tier.priceCents, tier.currency, JSON.stringify(tier.perks), tier.position);
  return tier;
}

export function deleteTier(id: string): void {
  getDb().prepare("DELETE FROM tiers WHERE id = ?").run(id);
}

export function subscribe(tierId: string | null, provider: PayProvider): void {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE member_state SET subscribed = 1, tier_id = ?, provider = ?, subscribed_at = ? WHERE id = 'you'")
    .run(tierId, provider, now);
  getDb()
    .prepare("UPDATE creators SET first_subscriber_at = COALESCE(first_subscriber_at, ?) WHERE id = 'alex'")
    .run(now);
}

// ---- creator profile & plan ----

export function updateCreatorProfile(input: {
  name?: string;
  brand?: string;
  tagline?: string;
  accent?: string;
  niche?: string;
  audienceSize?: string;
}): CreatorProfile {
  const cur = getCreator();
  getDb()
    .prepare(
      "UPDATE creators SET name = ?, brand = ?, tagline = ?, accent = ?, niche = ?, audience_size = ? WHERE id = 'alex'"
    )
    .run(
      input.name?.trim() || cur.name,
      input.brand?.trim() || cur.brand,
      input.tagline?.trim() || cur.tagline,
      input.accent || cur.accent,
      input.niche ?? cur.niche,
      input.audienceSize ?? cur.audienceSize
    );
  return getCreator();
}

export function setCreatorPlan(input: {
  planTier: string;
  seats: number;
  trial: boolean;
}): CreatorProfile {
  const trialEndsAt = input.trial
    ? new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()
    : null;
  getDb()
    .prepare("UPDATE creators SET plan_tier = ?, seats = ?, trial_ends_at = ? WHERE id = 'alex'")
    .run(input.planTier, input.seats, trialEndsAt);
  return getCreator();
}

export function launchCreator(): CreatorProfile {
  getDb()
    .prepare("UPDATE creators SET launched = 1, onboarding_done = 1 WHERE id = 'alex'")
    .run();
  return getCreator();
}

// ---- onboarding ----

export function saveOnboardingSteps(labels: string[]): OnboardingStep[] {
  const db = getDb();
  db.prepare("DELETE FROM onboarding_steps").run();
  const ins = db.prepare("INSERT INTO onboarding_steps (id, label, position) VALUES (?, ?, ?)");
  labels
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((label, i) => ins.run(newId("os"), label, i));
  return listOnboardingSteps();
}

export function completeOnboarding(input: {
  displayName: string;
  completedStepIds: string[];
}): MemberProfile {
  getDb()
    .prepare("UPDATE member_state SET display_name = ?, onboarded = 1, completed_step_ids = ? WHERE id = 'you'")
    .run(input.displayName.trim() || "Member", JSON.stringify(input.completedStepIds));
  return getMemberProfile();
}

// ---- media & assets ----

export function saveMedia(input: {
  kind: string;
  raw: Buffer;
  mime: string;
  durationSec?: number;
}): { id: string; mime: string; processed: boolean } {
  const id = newId("m");
  const processed = input.kind.startsWith("ghost")
    ? processAudio(id, input.raw)
    : { buf: input.raw, mime: input.mime, processed: false };
  const mime = processed.processed ? processed.mime : input.mime;
  putObject(id, processed.buf);
  getDb()
    .prepare(
      "INSERT INTO media (id, kind, mime, size, duration_sec, processed, created_at, edits) VALUES (?, ?, ?, ?, ?, ?, ?, '[]')"
    )
    .run(id, input.kind, mime, processed.buf.length, input.durationSec ?? null, processed.processed ? 1 : 0, new Date().toISOString());
  return { id, mime, processed: processed.processed };
}

export function saveAsset(raw: Buffer, mime: string, durationSec?: number): MediaAsset {
  const kind = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : "image";
  const saved = saveMedia({ kind, raw, mime, durationSec });
  const row = getDb().prepare("SELECT * FROM media WHERE id = ?").get(saved.id) as MediaRow;
  return mapAsset(row);
}

// Helpers hashSeed / detPoints / parseEditPoints are declared in the
// "media editor" section at the end of this file (function declarations hoist).
export function editAssetMock(
  mediaId: string,
  command: string
): { id: string; edits: EditPoint[]; applied: EditPoint[] } | null {
  const row = getDb().prepare("SELECT kind, duration_sec, edits FROM media WHERE id = ?").get(mediaId) as
    | { kind: string; duration_sec: number | null; edits: string }
    | undefined;
  if (!row) return null;

  const dur = row.duration_sec && row.duration_sec > 0 ? row.duration_sec : 90;
  const seed = hashSeed(mediaId + command);
  const ops: EditPoint[] = [];
  const push = (op: EditPoint["op"], label: string, atSec = 0, durSec?: number) => {
    const point: EditPoint = { id: newId("e"), op, label, atSec: Math.max(0, Math.round(atSec * 10) / 10) };
    if (durSec) point.durSec = Math.round(durSec * 10) / 10;
    ops.push(point);
  };

  // /clean background hum (aliases: clean hum, background noise, denoise)
  if (/(?:\/clean|clean|denoise)\b[^\n]*?(hum|noise)|background\s+(hum|noise)/i.test(command)) {
    push("hum", "Removed background hum", dur * (0.06 + (seed % 10) / 100), Math.max(4, dur * 0.14));
  }
  // remove filler words (um/uh)
  if (/filler|\bums?\b|\buhs?\b/i.test(command)) {
    detPoints(seed, dur, [0.24, 0.57]).forEach((at) => push("filler", "Cut filler word", at, 0.6));
  }
  // trim silent pauses (aliases: trim silence / silent pauses / remove silence)
  if (/trim\s+silent|silent\s+pauses?|trim\s+silence|remove\s+silence/i.test(command)) {
    detPoints(seed + 7, dur, [0.13, 0.52, 0.9]).forEach((at, i) =>
      push("silence", "Trimmed silent pause", at, [1.6, 2.1, 1.2][i % 3])
    );
  }
  const trim = command.match(/trim(?:\s+to)?\s+(\d+)\s*s/i);
  if (trim) push("trim", `Trim to ${trim[1]}s`, Math.min(Number(trim[1]), dur));
  if (/crop\s+(square|1:1)/i.test(command)) push("crop", "Crop square (1:1)");
  else if (/crop\s+16:9/i.test(command)) push("crop", "Crop 16:9");
  const cap = command.match(/caption\s*["“](.+?)["”]/i) ?? command.match(/caption\s+(.+)/i);
  if (cap) push("caption", `Caption: "${cap[1].trim()}"`, Math.min(3, dur * 0.05));
  if (/filter\s+(bw|black\s?and\s?white)/i.test(command)) push("filter", "Filter: black & white");
  else if (/filter\s+warm/i.test(command)) push("filter", "Filter: warm");
  if (ops.length === 0) push("enhance", "Smart enhance (auto)");

  const edits = [...parseEditPoints(row.edits), ...ops];
  getDb().prepare("UPDATE media SET edits = ? WHERE id = ?").run(JSON.stringify(edits), mediaId);
  return { id: mediaId, edits, applied: ops };
}

export function deleteAsset(id: string): void {
  getDb().prepare("DELETE FROM media WHERE id = ?").run(id);
  deleteObject(id);
}

export function readMedia(id: string): { buf: Buffer; mime: string } | null {
  const row = getDb().prepare("SELECT mime FROM media WHERE id = ?").get(id) as { mime: string } | undefined;
  if (!row) return null;
  const buf = getObject(id);
  return buf ? { buf, mime: row.mime } : null;
}

// ---- ghost coaching ----

function insertNotification(channel: string, text: string): void {
  getDb()
    .prepare("INSERT INTO notifications (id, channel, text, created_at) VALUES (?, ?, ?, ?)")
    .run(newId("n"), channel, text, new Date().toISOString());
}

export async function createGhostMemo(milestone: string): Promise<GhostMemo> {
  const gam = getGam();
  const member = getMemberProfile();
  const name = member.displayName ?? "Your member";
  const lvl = levelFor(gam.xp).level;
  const ai = await aiComplete(
    "You write coaching briefings about a member's milestone for their coach. Exactly 3 sentences, third person, specific and warm.",
    `Member: ${name}. Milestone: ${milestone}. They are level ${lvl} with a ${gam.streak}-day streak and ${gam.xp} total XP.`,
    { maxTokens: 200 }
  );
  const summary =
    ai ??
    `${name} just hit a milestone: ${milestone}. They are level ${lvl} on a ${gam.streak}-day streak with ${gam.xp} XP. Record a 15-second voice memo to keep their momentum going.`;
  const now = new Date().toISOString();
  const memo: GhostMemo = {
    id: newId("g"),
    milestone,
    summary,
    status: "pending_coach",
    coachMediaId: null,
    replyMediaId: null,
    replySummary: null,
    followUpQueued: false,
    listened: false,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO ghost_memos (id, milestone, summary, status, coach_media_id, reply_media_id, reply_summary, follow_up_queued, listened, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0, 0, ?, ?)`
    )
    .run(memo.id, memo.milestone, memo.summary, memo.status, now, now);
  // Mock WhatsApp/Telegram delivery — logged in the notifications table.
  insertNotification("whatsapp", `Ghost Coaching alert: ${summary}`);
  insertNotification("telegram", `Ghost Coaching alert: ${summary}`);
  return memo;
}

function touchGhost(id: string): void {
  getDb().prepare("UPDATE ghost_memos SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

export function attachCoachMemo(memoId: string, mediaId: string): void {
  getDb()
    .prepare("UPDATE ghost_memos SET coach_media_id = ?, status = 'awaiting_member' WHERE id = ?")
    .run(mediaId, memoId);
  touchGhost(memoId);
}

export function markGhostListened(memoId: string): GamResult {
  const row = getDb().prepare("SELECT listened FROM ghost_memos WHERE id = ?").get(memoId) as
    | { listened: number }
    | undefined;
  if (!row || row.listened === 1) {
    return { gam: getGam(), toasts: [] };
  }
  const cfg = getGamConfig();
  const result = applyAndSave((g) => ({
    g: { ...g, xp: g.xp + cfg.xpGhostListen },
    toasts: [{ title: `+${cfg.xpGhostListen} XP`, detail: "Ghost memo listened" }],
  }));
  getDb().prepare("UPDATE ghost_memos SET listened = 1 WHERE id = ?").run(memoId);
  touchGhost(memoId);
  return result;
}

export function attachGhostReply(memoId: string, mediaId: string): void {
  // Real transcription (Whisper) is the seam here — without it we can only
  // acknowledge the voice reply, not summarize its content.
  const replySummary =
    "Voice reply received (15s). Automatic transcription is not configured in this MVP, so there is no text summary yet — play the reply audio directly from the Ghost inbox.";
  getDb()
    .prepare("UPDATE ghost_memos SET reply_media_id = ?, reply_summary = ?, status = 'done' WHERE id = ?")
    .run(mediaId, replySummary, memoId);
  touchGhost(memoId);
}

export async function queueGhostFollowup(memoId: string): Promise<GhostMemo | null> {
  const row = getDb().prepare("SELECT milestone FROM ghost_memos WHERE id = ?").get(memoId) as
    | { milestone: string }
    | undefined;
  if (!row) return null;
  getDb().prepare("UPDATE ghost_memos SET follow_up_queued = 1 WHERE id = ?").run(memoId);
  return createGhostMemo(`Follow-up on: ${row.milestone}`);
}

export function resetAll(): Bootstrap {
  resetDb(getDb());
  return getBootstrap();
}

// ---- text/voice-driven media editor (PRD 6.1.1) ----
// Everything below is additive; the only pre-existing function touched by this
// feature is editAssetMock above.

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic plausible timeline positions, jittered by seed.
function detPoints(seed: number, dur: number, fractions: number[]): number[] {
  return fractions
    .map((f, i) => dur * f + (((seed >> (i * 4)) % 7) - 3))
    .map((at) => Math.min(Math.max(at, 1), Math.max(dur - 2, 1)));
}

// Read-side normalization: the media.edits column may hold legacy plain-string
// labels or structured EditPoint objects; both come out as EditPoint[].
function parseEditPoints(raw: string): EditPoint[] {
  let arr: unknown[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    arr = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    arr = raw ? [raw] : [];
  }
  return arr.map((e, i) =>
    typeof e === "string" || typeof e !== "object" || e === null
      ? { id: `legacy-${i}`, op: "legacy" as const, label: String(e), atSec: 0 }
      : (e as EditPoint)
  );
}

// Idempotent migration guard for this feature's columns (db.ts is untouched).
let assetEditSchemaReady = false;
export function ensureAssetEditSchema(): void {
  if (assetEditSchemaReady) return;
  const db = getDb();
  try {
    db.exec("ALTER TABLE media ADD COLUMN featured INTEGER NOT NULL DEFAULT 0");
  } catch {
    // column already exists
  }
  try {
    db.exec("ALTER TABLE media ADD COLUMN version INTEGER NOT NULL DEFAULT 0");
  } catch {
    // column already exists
  }
  assetEditSchemaReady = true;
}

interface MediaFullRow extends MediaRow {
  featured: number;
  version: number;
}

function mapAssetFull(r: MediaFullRow): MediaAsset {
  const editPoints = parseEditPoints(r.edits);
  return {
    ...mapAsset(r),
    edits: editPoints.map((e) => e.label),
    editPoints,
    featured: r.featured === 1,
    version: r.version,
  };
}

export function getAssetFull(id: string): MediaAsset | null {
  ensureAssetEditSchema();
  const row = getDb().prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaFullRow | undefined;
  return row ? mapAssetFull(row) : null;
}

export function listAssetsFull(): MediaAsset[] {
  ensureAssetEditSchema();
  const rows = getDb()
    .prepare("SELECT * FROM media WHERE kind IN ('image', 'video', 'audio') ORDER BY created_at DESC")
    .all() as MediaFullRow[];
  return rows.map(mapAssetFull);
}

export function removeAssetEdit(mediaId: string, editId: string): EditPoint[] | null {
  const row = getDb().prepare("SELECT edits FROM media WHERE id = ?").get(mediaId) as
    | { edits: string }
    | undefined;
  if (!row) return null;
  const edits = parseEditPoints(row.edits).filter((e) => e.id !== editId);
  getDb().prepare("UPDATE media SET edits = ? WHERE id = ?").run(JSON.stringify(edits), mediaId);
  return edits;
}

// Real image edits: overwrite the stored bytes and bump version so clients can
// cache-bust the immutable CDN route with ?v=.
export function replaceAssetImage(
  mediaId: string,
  buf: Buffer,
  mime: string
): { id: string; version: number; size: number } | null {
  ensureAssetEditSchema();
  const row = getDb().prepare("SELECT kind, version FROM media WHERE id = ?").get(mediaId) as
    | { kind: string; version: number }
    | undefined;
  if (!row || row.kind !== "image") return null;
  const version = (row.version ?? 0) + 1;
  putObject(mediaId, buf);
  getDb()
    .prepare("UPDATE media SET mime = ?, size = ?, version = ? WHERE id = ?")
    .run(mime, buf.length, version, mediaId);
  return { id: mediaId, version, size: buf.length };
}

export function setAssetFeatured(mediaId: string, featured: boolean): { id: string; featured: boolean } | null {
  ensureAssetEditSchema();
  const row = getDb().prepare("SELECT id FROM media WHERE id = ?").get(mediaId) as { id: string } | undefined;
  if (!row) return null;
  getDb().prepare("UPDATE media SET featured = ? WHERE id = ?").run(featured ? 1 : 0, mediaId);
  return { id: mediaId, featured };
}

// ---- HITL review queue ----

export function isHitlEnabled(): boolean {
  // Default ON: cross-checker-flagged answers queue for human review unless the
  // creator switches the dashboard toggle off (app_settings key hitl_enabled).
  return getSetting("hitl_enabled") !== "0";
}

export function setHitlEnabled(enabled: boolean): boolean {
  setSetting("hitl_enabled", enabled ? "1" : "0");
  return enabled;
}

interface ReviewRow {
  id: string;
  text: string;
  source: string | null;
  ts: number;
  reviewed: number;
  review_status: ReviewStatus | null;
  edited_answer: string | null;
  question: string | null;
}

function mapReviewItem(r: ReviewRow): ReviewItem {
  return {
    id: r.id,
    question: r.question ?? "",
    answer: r.text,
    source: r.source,
    ts: r.ts,
    memberId: "you", // single-member demo — chat_messages has no member column
    reviewed: r.reviewed === 1,
    reviewStatus: r.review_status,
    editedAnswer: r.edited_answer,
  };
}

const REVIEW_SELECT = `
  SELECT t.id, t.text, t.source, t.ts, t.reviewed, t.review_status, t.edited_answer,
    (SELECT u.text FROM chat_messages u
      WHERE u.role = 'user' AND u.ts <= t.ts
      ORDER BY u.ts DESC, u.id DESC LIMIT 1) AS question
  FROM chat_messages t
  WHERE t.role = 'twin' AND t.verified = 0`;

export function listReviewQueue(limit = 50): ReviewItem[] {
  const rows = getDb()
    .prepare(`${REVIEW_SELECT} AND t.reviewed = 0 ORDER BY t.ts DESC LIMIT ?`)
    .all(limit) as ReviewRow[];
  return rows.map(mapReviewItem);
}

export function countPendingReview(): number {
  return (
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM chat_messages WHERE role = 'twin' AND verified = 0 AND reviewed = 0"
      )
      .get() as { c: number }
  ).c;
}

export function getReviewState(): ReviewQueueState {
  return {
    hitlEnabled: isHitlEnabled(),
    pendingCount: countPendingReview(),
    items: listReviewQueue(),
  };
}

export function reviewChatMessage(
  messageId: string,
  action: ReviewAction,
  editedAnswer?: string
): ReviewQueueState | null {
  const row = getDb()
    .prepare(
      "SELECT id FROM chat_messages WHERE id = ? AND role = 'twin' AND verified = 0 AND reviewed = 0"
    )
    .get(messageId) as { id: string } | undefined;
  if (!row) return null;

  if (action === "approve") {
    getDb()
      .prepare("UPDATE chat_messages SET reviewed = 1, review_status = 'approved' WHERE id = ?")
      .run(messageId);
  } else if (action === "edit") {
    const edited = editedAnswer?.trim();
    if (!edited) return null;
    getDb()
      .prepare(
        "UPDATE chat_messages SET reviewed = 1, review_status = 'edited', edited_answer = ? WHERE id = ?"
      )
      .run(edited, messageId);
  } else {
    getDb()
      .prepare("UPDATE chat_messages SET reviewed = 1, review_status = 'rejected' WHERE id = ?")
      .run(messageId);
  }
  return getReviewState();
}

// ---- creator analytics ----

export const PLATFORM_COMMISSION_PCT = 5;

export function getAnalytics(): AnalyticsReport {
  const db = getDb();
  const DAY = 24 * 3600 * 1000;
  const cutoff7 = dateKey(new Date(Date.now() - 6 * DAY));

  const memberRows = db
    .prepare(
      "SELECT subscribed, xp, last_active_date, active_dates, display_name FROM member_state"
    )
    .all() as Array<{
    subscribed: number;
    xp: number;
    last_active_date: string | null;
    active_dates: string;
    display_name: string | null;
  }>;

  // Real MRR: active subscriptions joined to their tier price, per currency.
  const mrrRows = db
    .prepare(
      `SELECT t.currency AS currency, SUM(t.price_cents) AS cents, COUNT(*) AS n
       FROM member_state m JOIN tiers t ON t.id = m.tier_id
       WHERE m.subscribed = 1
       GROUP BY t.currency ORDER BY t.currency`
    )
    .all() as Array<{ currency: Currency; cents: number | null; n: number }>;

  const activeLast7d = memberRows.filter(
    (m) => m.last_active_date !== null && m.last_active_date >= cutoff7
  ).length;
  const atRisk = memberRows.filter(
    (m) => m.last_active_date === null || m.last_active_date < cutoff7
  );

  const ghostRow = db
    .prepare(
      `SELECT
         SUM(CASE WHEN coach_media_id IS NOT NULL THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN reply_media_id IS NOT NULL THEN 1 ELSE 0 END) AS replies
       FROM ghost_memos`
    )
    .get() as { sent: number | null; replies: number | null };
  const memosSent = ghostRow.sent ?? 0;
  const replies = ghostRow.replies ?? 0;

  // Activity per day: member check-ins (active_dates) + chat messages, last 28 days.
  const heatmap: Array<{ date: string; count: number }> = [];
  const counts = new Map<string, number>();
  for (let i = 27; i >= 0; i--) {
    const k = dateKey(new Date(Date.now() - i * DAY));
    counts.set(k, 0);
    heatmap.push({ date: k, count: 0 });
  }
  const chatDays = db
    .prepare(
      "SELECT date(ts / 1000, 'unixepoch', 'localtime') AS d, COUNT(*) AS c FROM chat_messages GROUP BY d"
    )
    .all() as Array<{ d: string; c: number }>;
  for (const r of chatDays) {
    if (counts.has(r.d)) counts.set(r.d, (counts.get(r.d) ?? 0) + r.c);
  }
  for (const m of memberRows) {
    let dates: string[] = [];
    try {
      dates = JSON.parse(m.active_dates) as string[];
    } catch {
      // malformed JSON — skip this member's check-ins
    }
    for (const d of dates) {
      if (counts.has(d)) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  for (const day of heatmap) day.count = counts.get(day.date) ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    subscribers: { total: memberRows.length, active: memberRows.filter((m) => m.subscribed === 1).length },
    mrr: mrrRows.map((r) => ({ currency: r.currency, amountCents: r.cents ?? 0, subscribers: r.n })),
    commissionPct: PLATFORM_COMMISSION_PCT,
    engagement: {
      activeLast7d,
      totalXp: memberRows.reduce((s, m) => s + m.xp, 0),
    },
    churnRisk: {
      count: atRisk.length,
      names: atRisk.map((m) => m.display_name?.trim().split(/\s+/)[0] || "Member"),
    },
    ghost: {
      memosSent,
      replies,
      responseRate: memosSent > 0 ? replies / memosSent : null,
    },
    heatmap,
  };
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function getAnalyticsCsv(): string {
  const a = getAnalytics();
  const lines: string[] = [];
  lines.push(`CoachOS analytics export,${dateKey()}`);
  lines.push("");
  lines.push("[SUBSCRIBERS]");
  lines.push("metric,value");
  lines.push(`total_members,${a.subscribers.total}`);
  lines.push(`active_subscribers,${a.subscribers.active}`);
  lines.push("");
  lines.push("[REVENUE]");
  lines.push("currency,mrr,subscribers");
  for (const m of a.mrr) {
    lines.push(`${m.currency},${(m.amountCents / 100).toFixed(2)},${m.subscribers}`);
  }
  lines.push(`platform_commission_pct,${a.commissionPct},`);
  lines.push(`creator_keep_pct,${100 - a.commissionPct},`);
  lines.push("");
  lines.push("[ENGAGEMENT]");
  lines.push(`members_active_last_7d,${a.engagement.activeLast7d}`);
  lines.push(`total_xp_issued,${a.engagement.totalXp}`);
  lines.push("");
  lines.push("[CHURN RISK - last activity over 7d ago]");
  lines.push(`at_risk_members,${a.churnRisk.count}`);
  lines.push(`names,${csvCell(a.churnRisk.names.join("; "))}`);
  lines.push("");
  lines.push("[GHOST COACHING]");
  lines.push(`memos_sent,${a.ghost.memosSent}`);
  lines.push(`replies,${a.ghost.replies}`);
  lines.push(
    `response_rate,${a.ghost.responseRate === null ? "" : `${(a.ghost.responseRate * 100).toFixed(1)}%`}`
  );
  lines.push("");
  lines.push("[ACTIVITY - LAST 28 DAYS]");
  lines.push("date,check_ins_plus_chats");
  for (const d of a.heatmap) lines.push(`${d.date},${d.count}`);
  return lines.join("\n") + "\n";
}

// ---- knowledge base management (studio) ----

export function deleteKnowledge(id: string): boolean {
  const res = getDb().prepare("DELETE FROM knowledge_docs WHERE id = ?").run(id);
  return res.changes > 0;
}

// Inline edit from the studio knowledge manager. `text` is the whole document
// as plain text; paragraphs replace body, existing key points are kept.
export function updateKnowledge(input: {
  id: string;
  title?: string;
  text?: string;
}): KnowledgeDoc | null {
  const row = getDb().prepare("SELECT * FROM knowledge_docs WHERE id = ?").get(input.id) as
    | KnowledgeRow
    | undefined;
  if (!row) return null;
  const cur = mapKnowledge(row);
  const title = input.title !== undefined && input.title.trim() ? input.title.trim() : cur.title;
  const body =
    input.text !== undefined
      ? input.text
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
      : cur.body;
  getDb()
    .prepare("UPDATE knowledge_docs SET title = ?, body = ? WHERE id = ?")
    .run(title, JSON.stringify(body), input.id);
  return { ...cur, title, body };
}

// ---- portal customization studio (PRD 6.1.4) ----
// Everything below is additive. The only pre-existing code touched by this
// feature is the creator row mapping above (CreatorRow/mapCreator) plus one
// ensure call at the top of getBootstrap.

// Idempotent migration guard for this feature's creators columns (db.ts is
// untouched, per the ensureAssetEditSchema precedent).
let portalCustomizeSchemaReady = false;
export function ensurePortalCustomizeSchema(): void {
  if (portalCustomizeSchemaReady) return;
  const db = getDb();
  try {
    db.exec("ALTER TABLE creators ADD COLUMN theme TEXT");
  } catch {
    // column already exists
  }
  try {
    db.exec("ALTER TABLE creators ADD COLUMN portal_layout TEXT");
  } catch {
    // column already exists
  }
  portalCustomizeSchemaReady = true;
}

// Read-side normalization for creators.portal_layout (JSON or NULL).
function parsePortalLayoutRow(raw: string | null | undefined): PortalLayout | null {
  if (!raw) return null;
  try {
    return normalizeLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

// One-shot save from /studio/customize: branding (brand/tagline/accent, same
// creator row the wizard feeds) + theme skin + section layout.
export function savePortalCustomization(input: {
  name?: string;
  brand?: string;
  tagline?: string;
  accent?: string;
  theme?: string | null;
  portalLayout?: unknown;
}): CreatorProfile {
  ensurePortalCustomizeSchema();
  const cur = getCreator();
  // theme: undefined = keep, null = clear back to default, known id = set.
  // An unknown id keeps the current value (the API route 400s those anyway).
  const theme: PortalThemeId | null =
    input.theme === undefined
      ? (cur.theme ?? null)
      : input.theme === null
        ? null
        : isPortalThemeId(input.theme)
          ? input.theme
          : (cur.theme ?? null);
  const layout: PortalLayout | null =
    input.portalLayout === undefined
      ? (cur.portalLayout ?? null)
      : normalizeLayout(input.portalLayout);
  getDb()
    .prepare(
      "UPDATE creators SET name = ?, brand = ?, tagline = ?, accent = ?, theme = ?, portal_layout = ? WHERE id = 'alex'"
    )
    .run(
      input.name?.trim() || cur.name,
      input.brand?.trim() || cur.brand,
      input.tagline?.trim() || cur.tagline,
      input.accent || cur.accent,
      theme,
      layout ? JSON.stringify(layout) : null
    );
  return getCreator();
}

// Publish/unpublish — launched is now two-way. Launching preserves the old
// behavior of also marking creator onboarding done.
export function setCreatorLaunched(launched: boolean): CreatorProfile {
  getDb()
    .prepare(
      launched
        ? "UPDATE creators SET launched = 1, onboarding_done = 1 WHERE id = 'alex'"
        : "UPDATE creators SET launched = 0 WHERE id = 'alex'"
    )
    .run();
  return getCreator();
}
