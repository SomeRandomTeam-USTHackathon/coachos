import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { initialGamification } from "@/lib/gamification";
import { CREATOR, DEFAULT_TWIN, ISSUES, SEASONS } from "@/lib/seed";

const DB_PATH = path.join(process.cwd(), "data", "coachos.db");

// Cache on globalThis so Next.js dev hot-reloads don't open duplicate handles.
const globalForDb = globalThis as unknown as { __coachosDb?: Database.Database };

export function getDb(): Database.Database {
  if (globalForDb.__coachosDb) return globalForDb.__coachosDb;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  seedIfEmpty(db);
  seedAuxIfEmpty(db);
  globalForDb.__coachosDb = db;
  return db;
}

function addColumn(db: Database.Database, table: string, columnDef: string): void {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch {
    // column already exists
  }
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      tagline TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      month TEXT NOT NULL,
      position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL REFERENCES seasons(id),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      key_points TEXT NOT NULL,
      body TEXT NOT NULL,
      access TEXT NOT NULL,
      published_at TEXT NOT NULL,
      read_minutes INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS twin_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tone TEXT NOT NULL,
      greeting TEXT NOT NULL,
      trained_issue_ids TEXT NOT NULL,
      trained_at TEXT
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      source TEXT,
      ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      key_points TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS member_state (
      id TEXT PRIMARY KEY,
      subscribed INTEGER NOT NULL,
      xp INTEGER NOT NULL,
      streak INTEGER NOT NULL,
      last_active_date TEXT,
      active_dates TEXT NOT NULL,
      badges TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      completed_issue_ids TEXT NOT NULL,
      unlocked_archive_ids TEXT NOT NULL,
      twin_questions_total INTEGER NOT NULL,
      daily TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tiers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      perks TEXT NOT NULL,
      position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS onboarding_steps (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      duration_sec REAL,
      processed INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ghost_memos (
      id TEXT PRIMARY KEY,
      milestone TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      coach_media_id TEXT,
      reply_media_id TEXT,
      reply_summary TEXT,
      follow_up_queued INTEGER NOT NULL DEFAULT 0,
      listened INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  addColumn(db, "member_state", "tier_id TEXT");
  addColumn(db, "member_state", "provider TEXT");
  addColumn(db, "member_state", "subscribed_at TEXT");
  addColumn(db, "member_state", "display_name TEXT");
  addColumn(db, "member_state", "onboarded INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "member_state", "completed_step_ids TEXT NOT NULL DEFAULT '[]'");
  // gamification depth (PRD 6.2.3)
  addColumn(db, "member_state", "streak_freezes INTEGER NOT NULL DEFAULT 1");
  addColumn(db, "member_state", "previous_streak INTEGER");
  addColumn(db, "member_state", "break_key TEXT");
  addColumn(db, "member_state", "prestige_count INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "member_state", "frozen_dates TEXT NOT NULL DEFAULT '[]'");
  addColumn(db, "member_state", "title TEXT");
  addColumn(db, "member_state", "perk_level INTEGER NOT NULL DEFAULT 1");
  addColumn(db, "member_state", "last_freeze_milestone INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "chat_messages", "verified INTEGER");
  addColumn(db, "chat_messages", "reviewed INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "chat_messages", "review_status TEXT");
  addColumn(db, "chat_messages", "edited_answer TEXT");
  addColumn(db, "creators", "niche TEXT DEFAULT 'Fitness'");
  addColumn(db, "creators", "audience_size TEXT DEFAULT '1k-10k'");
  addColumn(db, "creators", "plan_tier TEXT");
  addColumn(db, "creators", "seats INTEGER");
  addColumn(db, "creators", "trial_ends_at TEXT");
  addColumn(db, "creators", "launched INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "creators", "accent TEXT DEFAULT '#8b5cf6'");
  addColumn(db, "creators", "first_subscriber_at TEXT");
  addColumn(db, "creators", "onboarding_done INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "twin_config", "disclosure TEXT");
  addColumn(db, "media", "edits TEXT NOT NULL DEFAULT '[]'");
}

function seedIfEmpty(db: Database.Database): void {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM issues").get() as { c: number };
  if (c > 0) return;

  const seed = db.transaction(() => {
    db.prepare("INSERT INTO creators (id, name, brand, tagline) VALUES (?, ?, ?, ?)").run(
      "alex",
      CREATOR.name,
      CREATOR.brand,
      CREATOR.tagline
    );

    const insSeason = db.prepare(
      "INSERT INTO seasons (id, title, month, position) VALUES (?, ?, ?, ?)"
    );
    SEASONS.forEach((s, i) => insSeason.run(s.id, s.title, s.month, i));

    const insIssue = db.prepare(
      `INSERT INTO issues (id, season_id, title, summary, key_points, body, access, published_at, read_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const i of ISSUES) {
      insIssue.run(
        i.id,
        i.seasonId,
        i.title,
        i.summary,
        JSON.stringify(i.keyPoints),
        JSON.stringify(i.body),
        i.access,
        i.publishedAt,
        i.readMinutes
      );
    }

    db.prepare(
      `INSERT INTO twin_config (id, name, tone, greeting, trained_issue_ids, trained_at)
       VALUES (1, ?, ?, ?, ?, ?)`
    ).run(
      DEFAULT_TWIN.name,
      DEFAULT_TWIN.tone,
      DEFAULT_TWIN.greeting,
      JSON.stringify(DEFAULT_TWIN.trainedIssueIds),
      DEFAULT_TWIN.trainedAt
    );

    const g = initialGamification();
    db.prepare(
      `INSERT INTO member_state
         (id, subscribed, xp, streak, last_active_date, active_dates, badges, tokens,
          completed_issue_ids, unlocked_archive_ids, twin_questions_total, daily)
       VALUES ('you', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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
  });
  seed();
}

function seedAuxIfEmpty(db: Database.Database): void {
  const tierCount = (db.prepare("SELECT COUNT(*) AS c FROM tiers").get() as { c: number }).c;
  if (tierCount === 0) {
    const ins = db.prepare(
      "INSERT INTO tiers (id, name, price_cents, currency, perks, position) VALUES (?, ?, ?, ?, ?, ?)"
    );
    ins.run("t-monthly-usd", "Monthly", 1900, "USD", JSON.stringify(["All member issues", "AI Twin chat", "Ghost Coaching memos"]), 0);
    ins.run("t-monthly-hkd", "月度会员", 14900, "HKD", JSON.stringify(["全部会员内容", "AI 孪生对话", "Ghost Coaching 语音便签", "支持八达通"]), 1);
  }
  const stepCount = (db.prepare("SELECT COUNT(*) AS c FROM onboarding_steps").get() as { c: number }).c;
  if (stepCount === 0) {
    const ins = db.prepare("INSERT INTO onboarding_steps (id, label, position) VALUES (?, ?, ?)");
    ins.run("os1", "Read the community rules", 0);
    ins.run("os2", "Set your weekly goal", 1);
    ins.run("os3", "Meet your AI twin", 2);
  }
}

export function resetDb(db: Database.Database): void {
  db.exec(`
    DELETE FROM chat_messages;
    DELETE FROM member_state;
    DELETE FROM twin_config;
    DELETE FROM issues;
    DELETE FROM seasons;
    DELETE FROM creators;
    DELETE FROM knowledge_docs;
    DELETE FROM tiers;
    DELETE FROM onboarding_steps;
    DELETE FROM media;
    DELETE FROM ghost_memos;
    DELETE FROM notifications;
  `);
  seedIfEmpty(db);
  seedAuxIfEmpty(db);
}
