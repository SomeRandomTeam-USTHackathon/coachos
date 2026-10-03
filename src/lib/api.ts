import type { GamToast } from "./gamification";
import type {
  Access,
  AppNotification,
  ChatMessage,
  CreatorProfile,
  GamConfig,
  GamificationState,
  GhostMemo,
  Issue,
  MediaAsset,
  MemberProfile,
  OnboardingStep,
  Season,
  Tier,
  TwinConfig,
} from "./types";

export interface Bootstrap {
  creator: CreatorProfile;
  seasons: Season[];
  issues: Issue[];
  twin: TwinConfig;
  chat: ChatMessage[];
  gam: GamificationState;
  subscribed: boolean;
  knowledge: Array<{ id: string; title: string }>;
  twinStats: { issues: number; knowledge: number; chunks: number };
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

export interface PublishPayload {
  seasonId: string; // existing id, "current", or "new"
  newSeasonTitle?: string;
  title: string;
  summary: string;
  keyPoints: string[];
  body: string[];
  access: Access;
  readMinutes: number;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { method: "GET" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}
