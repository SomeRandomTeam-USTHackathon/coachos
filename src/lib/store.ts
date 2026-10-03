"use client";

import { create } from "zustand";
import { api, type Bootstrap, type GamResult, type PublishPayload, type TwinChatResult } from "./api";
import { DEFAULT_GAM_CONFIG, initialGamification, type GamToast } from "./gamification";
import type {
  AppNotification,
  ChatMessage,
  CreatorProfile,
  Currency,
  GamConfig,
  GamificationState,
  GhostMemo,
  Issue,
  MediaAsset,
  MemberProfile,
  OnboardingStep,
  PayProvider,
  Season,
  Tier,
  Toast,
  TwinConfig,
} from "./types";
import type { EditPoint } from "./types";

let toastId = 0;
const withIds = (items: GamToast[]): Toast[] => items.map((t) => ({ ...t, id: ++toastId }));

export interface KnowledgeMeta {
  id: string;
  title: string;
}

export interface TwinStats {
  issues: number;
  knowledge: number;
  chunks: number;
}

const emptyMember: MemberProfile = {
  displayName: null,
  onboarded: true, // pre-hydrate placeholder; real value comes from the server
  tierId: null,
  provider: null,
  subscribedAt: null,
  completedStepIds: [],
};

const emptyCreator: CreatorProfile = {
  name: "",
  brand: "CoachOS",
  tagline: "",
  niche: null,
  audienceSize: null,
  planTier: null,
  seats: null,
  trialEndsAt: null,
  launched: true, // pre-hydrate placeholder
  accent: "#8b5cf6",
  firstSubscriberAt: null,
  onboardingDone: true, // pre-hydrate placeholder
};

async function uploadAudio(
  path: string,
  memoId: string,
  blob: Blob,
  duration: number
): Promise<{ mediaId: string; processed: boolean; memos: GhostMemo[] }> {
  const form = new FormData();
  form.append("memoId", memoId);
  form.append("duration", String(duration));
  form.append("audio", blob, "memo.webm");
  const res = await fetch(path, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as { mediaId: string; processed: boolean; memos: GhostMemo[] };
}

interface StoreState {
  role: "creator" | "member";
  creator: CreatorProfile;
  subscribed: boolean;
  seasons: Season[];
  issues: Issue[];
  twin: TwinConfig;
  chat: ChatMessage[];
  gam: GamificationState;
  toasts: Toast[];
  knowledge: KnowledgeMeta[];
  twinStats: TwinStats;
  member: MemberProfile;
  tiers: Tier[];
  onboardingSteps: OnboardingStep[];
  ai: { configured: boolean; model: string };
  ghostMemos: GhostMemo[];
  notifications: AppNotification[];
  assets: MediaAsset[];
  gamConfig: GamConfig;
  checkoutOpen: boolean;

  hydrate: () => Promise<void>;
  setRole: (role: "creator" | "member") => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  subscribe: (tierId: string | null, provider: PayProvider) => Promise<void>;
  publishIssue: (payload: PublishPayload) => Promise<void>;
  saveTwin: (cfg: { name: string; tone: string; greeting: string; disclosure?: string }) => Promise<void>;
  trainTwin: () => Promise<void>;
  sendTwinMessage: (text: string) => Promise<string>;
  touch: () => Promise<void>;
  completeIssue: (issueId: string) => Promise<void>;
  claimQuest: (questId: string) => Promise<void>;
  unlockArchive: (issueId: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  saveAiSettings: (key?: string, model?: string) => Promise<void>;
  testAi: () => Promise<{ ok: boolean; detail: string }>;
  createTier: (input: { name: string; priceCents: number; currency: Currency; perks: string[] }) => Promise<void>;
  deleteTier: (id: string) => Promise<void>;
  saveOnboardingSteps: (steps: string[]) => Promise<void>;
  completeOnboarding: (displayName: string, completedStepIds: string[]) => Promise<void>;
  refreshGhost: () => Promise<void>;
  uploadGhostMemo: (memoId: string, blob: Blob, duration: number) => Promise<void>;
  uploadGhostReply: (memoId: string, blob: Blob, duration: number) => Promise<void>;
  listenGhost: (memoId: string) => Promise<void>;
  followupGhost: (memoId: string) => Promise<void>;
  saveCreatorProfile: (input: {
    name?: string;
    brand?: string;
    tagline?: string;
    accent?: string;
    niche?: string;
    audienceSize?: string;
  }) => Promise<void>;
  setCreatorPlan: (input: { planTier: string; seats: number; trial: boolean }) => Promise<void>;
  launchCreator: () => Promise<void>;
  saveGamConfig: (partial: Partial<GamConfig>) => Promise<void>;
  uploadAsset: (file: File) => Promise<void>;
  editAsset: (mediaId: string, command: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addKnowledgeText: (title: string, rawText: string) => Promise<void>;
  setKnowledgeMeta: (meta: KnowledgeMeta[]) => void;
  dismissToast: (id: number) => void;
  // text/voice-driven media editor (PRD 6.1.1)
  refreshAssets: () => Promise<void>;
  applyAssetEdit: (mediaId: string, command: string) => Promise<EditPoint[]>;
  removeAssetEditPoint: (mediaId: string, editId: string) => Promise<void>;
  replaceAssetImage: (mediaId: string, blob: Blob) => Promise<void>;
  setAssetFeatured: (mediaId: string, featured: boolean) => Promise<void>;
}

export const useStore = create<StoreState>()((set, get) => {
  const applyGam = (r: GamResult) =>
    set((s) => ({ gam: r.gam, toasts: [...s.toasts, ...withIds(r.toasts)] }));

  return {
    role: "member",
    creator: emptyCreator,
    subscribed: false,
    seasons: [],
    issues: [],
    twin: { name: "", tone: "energetic", greeting: "", trainedIssueIds: [], trainedAt: null, disclosure: null },
    chat: [],
    gam: initialGamification(),
    toasts: [],
    knowledge: [],
    twinStats: { issues: 0, knowledge: 0, chunks: 0 },
    member: emptyMember,
    tiers: [],
    onboardingSteps: [],
    ai: { configured: false, model: "openai/gpt-4o-mini" },
    ghostMemos: [],
    notifications: [],
    assets: [],
    gamConfig: DEFAULT_GAM_CONFIG,
    checkoutOpen: false,

    hydrate: async () => {
      const b = await api<Bootstrap>("/api/bootstrap");
      set({
        creator: b.creator,
        subscribed: b.subscribed,
        seasons: b.seasons,
        issues: b.issues,
        twin: b.twin,
        chat: b.chat,
        gam: b.gam,
        knowledge: b.knowledge,
        twinStats: b.twinStats,
        member: b.member,
        tiers: b.tiers,
        onboardingSteps: b.onboardingSteps,
        ai: b.ai,
        ghostMemos: b.ghostMemos,
        notifications: b.notifications,
        assets: b.assets,
        gamConfig: b.gamConfig,
      });
    },

    setRole: (role) => set({ role }),
    openCheckout: () => set({ checkoutOpen: true }),
    closeCheckout: () => set({ checkoutOpen: false }),

    subscribe: async (tierId, provider) => {
      const res = await api<{ subscribed: boolean; member: MemberProfile }>("/api/subscribe", {
        tierId,
        provider,
      });
      set((s) => ({
        subscribed: true,
        member: res.member,
        checkoutOpen: false,
        creator: s.creator.firstSubscriberAt
          ? s.creator
          : { ...s.creator, firstSubscriberAt: new Date().toISOString() },
        toasts: [
          ...s.toasts,
          ...withIds([{ title: "Subscribed (mock)", detail: "All member issues are now unlocked" }]),
        ],
      }));
    },

    publishIssue: async (payload) => {
      const res = await api<{ issue: Issue; newSeason?: Season }>("/api/issues", payload);
      set((s) => ({
        issues: [...s.issues, res.issue],
        seasons: res.newSeason ? [...s.seasons, res.newSeason] : s.seasons,
        toasts: [
          ...s.toasts,
          ...withIds([{ title: "Issue published", detail: "Live in the member portal" }]),
        ],
      }));
    },

    saveTwin: async (cfg) => {
      const twin = await api<TwinConfig>("/api/twin/persona", cfg);
      set({ twin });
    },

    trainTwin: async () => {
      const res = await api<{ twin: TwinConfig; chunks: number }>("/api/twin/train", {});
      set((s) => ({
        twin: res.twin,
        twinStats: { ...s.twinStats, issues: res.twin.trainedIssueIds.length, chunks: res.chunks },
        toasts: [...s.toasts, ...withIds([{ title: "Twin trained", detail: `Indexed ${res.chunks} chunks` }])],
      }));
    },

    sendTwinMessage: async (text) => {
      const tempId = `tmp-${Date.now()}`;
      set((s) => ({ chat: [...s.chat, { id: tempId, role: "user" as const, text, ts: Date.now() }] }));
      const res = await api<TwinChatResult>("/api/twin/chat", { text });
      set((s) => ({
        chat: [...s.chat.filter((c) => c.id !== tempId), res.userMsg, res.twinMsg],
        gam: res.gam,
        toasts: [...s.toasts, ...withIds(res.toasts)],
      }));
      return res.twinMsg.id;
    },

    touch: async () => {
      applyGam(await api<GamResult>("/api/gam/touch", {}));
    },

    completeIssue: async (issueId) => {
      if (get().gam.completedIssueIds.includes(issueId)) return;
      applyGam(await api<GamResult>("/api/gam/complete", { issueId }));
      // Completing an issue can trigger Ghost Coaching memos server-side.
      void get().refreshGhost();
    },

    claimQuest: async (questId) => {
      applyGam(await api<GamResult>("/api/gam/claim", { questId }));
    },

    unlockArchive: async (issueId) => {
      const g = get().gam;
      if (g.tokens < 1 || g.unlockedArchiveIds.includes(issueId)) return;
      applyGam(await api<GamResult>("/api/gam/unlock", { issueId }));
    },

    resetDemo: async () => {
      await api<Bootstrap>("/api/reset", {});
    },

    saveAiSettings: async (key, model) => {
      const body: { key?: string; model?: string } = {};
      if (key !== undefined) body.key = key;
      if (model !== undefined) body.model = model;
      const res = await api<{ configured: boolean; model: string }>("/api/settings/ai", body);
      set((s) => ({
        ai: res,
        toasts: [
          ...s.toasts,
          ...withIds([
            res.configured
              ? { title: "AI connected", detail: `Model: ${res.model}` }
              : { title: "AI settings saved", detail: "Running in mock mode" },
          ]),
        ],
      }));
    },

    testAi: () => api<{ ok: boolean; detail: string }>("/api/settings/ai/test", {}),

    createTier: async (input) => {
      const tier = await api<Tier>("/api/tiers", input);
      set((s) => ({ tiers: [...s.tiers, tier] }));
    },

    deleteTier: async (id) => {
      const tiers = await api<Tier[]>("/api/tiers/delete", { id });
      set({ tiers });
    },

    saveOnboardingSteps: async (steps) => {
      const onboardingSteps = await api<OnboardingStep[]>("/api/onboarding/steps", { steps });
      set((s) => ({
        onboardingSteps,
        toasts: [...s.toasts, ...withIds([{ title: "Onboarding steps saved" }])],
      }));
    },

    completeOnboarding: async (displayName, completedStepIds) => {
      const member = await api<MemberProfile>("/api/onboarding/complete", {
        displayName,
        completedStepIds,
      });
      set((s) => ({
        member,
        toasts: [...s.toasts, ...withIds([{ title: `Welcome, ${member.displayName}!`, detail: "Onboarding complete" }])],
      }));
    },

    refreshGhost: async () => {
      const res = await api<{ memos: GhostMemo[]; notifications: AppNotification[] }>("/api/ghost");
      set({ ghostMemos: res.memos, notifications: res.notifications });
    },

    uploadGhostMemo: async (memoId, blob, duration) => {
      const res = await uploadAudio("/api/ghost/memo", memoId, blob, duration);
      set((s) => ({
        ghostMemos: res.memos,
        toasts: [
          ...s.toasts,
          ...withIds([
            {
              title: "Voice memo sent",
              detail: res.processed ? "Transcoded with FFmpeg" : "Stored as-is (FFmpeg not installed)",
            },
          ]),
        ],
      }));
    },

    uploadGhostReply: async (memoId, blob, duration) => {
      const res = await uploadAudio("/api/ghost/reply", memoId, blob, duration);
      set((s) => ({
        ghostMemos: res.memos,
        toasts: [...s.toasts, ...withIds([{ title: "Reply sent to your coach" }])],
      }));
    },

    listenGhost: async (memoId) => {
      applyGam(await api<GamResult>("/api/ghost/listen", { memoId }));
      await get().refreshGhost();
    },

    followupGhost: async (memoId) => {
      const res = await api<{ memos: GhostMemo[]; notifications: AppNotification[] }>(
        "/api/ghost/followup",
        { memoId }
      );
      set((s) => ({
        ghostMemos: res.memos,
        notifications: res.notifications,
        toasts: [...s.toasts, ...withIds([{ title: "Follow-up queued", detail: "New memo is pending your voice note" }])],
      }));
    },

    saveCreatorProfile: async (input) => {
      const creator = await api<CreatorProfile>("/api/creator/profile", input);
      set({ creator });
    },

    setCreatorPlan: async (input) => {
      const creator = await api<CreatorProfile>("/api/creator/plan", input);
      set({ creator });
    },

    launchCreator: async () => {
      const creator = await api<CreatorProfile>("/api/creator/launch", {});
      set((s) => ({
        creator,
        toasts: [...s.toasts, ...withIds([{ title: "Portal launched", detail: `${creator.brand} is live for members` }])],
      }));
    },

    saveGamConfig: async (partial) => {
      const gamConfig = await api<GamConfig>("/api/settings/gam", partial);
      set((s) => ({
        gamConfig,
        toasts: [...s.toasts, ...withIds([{ title: "Gamification settings saved" }])],
      }));
    },

    uploadAsset: async (file) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/assets", { method: "POST", body: form });
      if (!res.ok) throw new Error(`/api/assets → HTTP ${res.status}`);
      const asset = (await res.json()) as MediaAsset;
      set((s) => ({
        assets: [asset, ...s.assets],
        toasts: [...s.toasts, ...withIds([{ title: "Asset uploaded", detail: `${asset.kind} · ${Math.round(asset.size / 1024)} KB` }])],
      }));
    },

    editAsset: async (mediaId, command) => {
      const res = await api<{ id: string; edits: string[]; applied: string[] }>("/api/assets/edit", {
        mediaId,
        command,
      });
      set((s) => ({
        assets: s.assets.map((a) => (a.id === mediaId ? { ...a, edits: res.edits } : a)),
        toasts: [...s.toasts, ...withIds([{ title: "Edit applied (mock)", detail: res.applied.join(" + ") }])],
      }));
    },

    deleteAsset: async (id) => {
      const assets = await api<MediaAsset[]>("/api/assets/delete", { id });
      set({ assets });
    },

    addKnowledgeText: async (title, rawText) => {
      const s = await api<{ keyPoints: string[]; body: string[] }>("/api/pipeline/structure", {
        rawText,
      });
      const doc = await api<{ id: string; title: string }>("/api/knowledge", {
        title,
        keyPoints: s.keyPoints,
        body: s.body,
      });
      set((s) => ({
        knowledge: [...s.knowledge, { id: doc.id, title: doc.title }],
        twinStats: { ...s.twinStats, knowledge: s.twinStats.knowledge + 1 },
        toasts: [...s.toasts, ...withIds([{ title: "Knowledge added", detail: doc.title }])],
      }));
    },

    setKnowledgeMeta: (meta) =>
      set((s) => ({ knowledge: meta, twinStats: { ...s.twinStats, knowledge: meta.length } })),

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // ---- text/voice-driven media editor (PRD 6.1.1) ----

    refreshAssets: async () => {
      const assets = await api<MediaAsset[]>("/api/assets/full");
      set({ assets });
    },

    applyAssetEdit: async (mediaId, command) => {
      const res = await api<{ id: string; edits: EditPoint[]; applied: EditPoint[] }>("/api/assets/edit", {
        mediaId,
        command,
      });
      set((s) => ({
        assets: s.assets.map((a) =>
          a.id === mediaId ? { ...a, editPoints: res.edits, edits: res.edits.map((e) => e.label) } : a
        ),
        toasts: [
          ...s.toasts,
          ...withIds([{ title: "Edit applied", detail: res.applied.map((e) => e.label).join(" + ") }]),
        ],
      }));
      return res.applied;
    },

    removeAssetEditPoint: async (mediaId, editId) => {
      const res = await fetch("/api/assets/edit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, editId }),
      });
      if (!res.ok) throw new Error(`/api/assets/edit DELETE → HTTP ${res.status}`);
      const data = (await res.json()) as { id: string; edits: EditPoint[] };
      set((s) => ({
        assets: s.assets.map((a) =>
          a.id === mediaId ? { ...a, editPoints: data.edits, edits: data.edits.map((e) => e.label) } : a
        ),
      }));
    },

    replaceAssetImage: async (mediaId, blob) => {
      const form = new FormData();
      form.append("file", blob, "edited.png");
      const res = await fetch(`/api/assets/${mediaId}/replace`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`/api/assets/${mediaId}/replace → HTTP ${res.status}`);
      const data = (await res.json()) as { id: string; version: number; size: number };
      set((s) => ({
        assets: s.assets.map((a) => (a.id === mediaId ? { ...a, version: data.version, size: data.size } : a)),
        toasts: [...s.toasts, ...withIds([{ title: "Image transformed", detail: "Real edit baked into the stored file" }])],
      }));
    },

    setAssetFeatured: async (mediaId, featured) => {
      const res = await api<{ id: string; featured: boolean }>("/api/assets/featured", { mediaId, featured });
      set((s) => ({
        assets: s.assets.map((a) => (a.id === mediaId ? { ...a, featured: res.featured } : a)),
        toasts: [
          ...s.toasts,
          ...withIds([
            res.featured
              ? { title: "Pushed to portal", detail: "Asset is now featured for members" }
              : { title: "Removed from portal", detail: "Asset is no longer featured" },
          ]),
        ],
      }));
    },
  };
});
