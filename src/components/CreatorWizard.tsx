"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { TONES } from "@/lib/twin";

const NICHES = ["Fitness", "Business", "Health & Wellness", "Education", "Career", "Finance", "Creative", "Other"];
const SIZES = ["<1k", "1k-10k", "10k-100k", "100k+"];
const PLANS = [
  { id: "starter", name: "Starter", price: 29, seats: 5 },
  { id: "pro", name: "Pro", price: 79, seats: 25 },
  { id: "studio", name: "Studio", price: 199, seats: 100 },
];

const PHASES = ["Sign up", "Niche", "Plan", "Content", "Customize", "Launch"];

export default function CreatorWizard() {
  const creator = useStore((s) => s.creator);
  const twin = useStore((s) => s.twin);
  const ai = useStore((s) => s.ai);
  const tiers = useStore((s) => s.tiers);
  const knowledge = useStore((s) => s.knowledge);
  const assets = useStore((s) => s.assets);
  const gamConfig = useStore((s) => s.gamConfig);
  const saveCreatorProfile = useStore((s) => s.saveCreatorProfile);
  const setCreatorPlan = useStore((s) => s.setCreatorPlan);
  const saveTwin = useStore((s) => s.saveTwin);
  const saveAiSettings = useStore((s) => s.saveAiSettings);
  const saveGamConfig = useStore((s) => s.saveGamConfig);
  const addKnowledgeText = useStore((s) => s.addKnowledgeText);
  const uploadAsset = useStore((s) => s.uploadAsset);
  const launchCreator = useStore((s) => s.launchCreator);

  const [phase, setPhase] = useState(0);
  const [name, setName] = useState(creator.name);
  const [brand, setBrand] = useState(creator.brand);
  const [niche, setNiche] = useState(creator.niche ?? NICHES[0]);
  const [size, setSize] = useState(creator.audienceSize ?? SIZES[1]);
  const [planId, setPlanId] = useState<string | null>(creator.planTier);
  const [seats, setSeats] = useState(creator.seats ?? 5);
  const [tagline, setTagline] = useState(creator.tagline);
  const [accent, setAccent] = useState(creator.accent ?? "#8b5cf6");
  const [tone, setTone] = useState(twin.tone);
  const [disclosure, setDisclosure] = useState(
    twin.disclosure ??
      `${twin.name} is an AI trained on the creator's content — answers may be imperfect.`
  );
  const [model, setModel] = useState(ai.model);
  const [knowledgeText, setKnowledgeText] = useState("");
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [xpRead, setXpRead] = useState(gamConfig.xpReadIssue);
  const [xpTwin, setXpTwin] = useState(gamConfig.xpTwinQuestion);
  const [toggles, setToggles] = useState({
    enableStreaks: gamConfig.enableStreaks,
    enableBadges: gamConfig.enableBadges,
    enableLeaderboard: gamConfig.enableLeaderboard,
    enableTokens: gamConfig.enableTokens,
    enableQuests: gamConfig.enableQuests,
  });

  const inputCls =
    "w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60";
  const labelCls = "text-xs font-bold uppercase tracking-widest text-[#9a9ab0]";

  const addKnowledge = async () => {
    const text = knowledgeText.trim();
    if (text.length < 50 || adding) return;
    setAdding(true);
    try {
      const title = text.split(/\s+/).slice(0, 7).join(" ");
      await addKnowledgeText(title, text);
      setKnowledgeText("");
    } finally {
      setAdding(false);
    }
  };

  const finishCustomize = async () => {
    await saveCreatorProfile({ name, brand, tagline, accent, niche, audienceSize: size });
    await saveTwin({ name: twin.name, tone, greeting: twin.greeting, disclosure });
    await saveAiSettings(undefined, model);
    await saveGamConfig({ xpReadIssue: xpRead, xpTwinQuestion: xpTwin, ...toggles });
    setPhase(5);
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
        CoachOS for Creators
      </div>
      <h1 className="mt-2 text-3xl font-black text-white">Set up your coaching business</h1>

      <ol className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {PHASES.map((label, i) => (
          <li
            key={label}
            className={`rounded-full border px-2.5 py-1 ${
              i === phase
                ? "border-violet-500/60 text-violet-300"
                : i < phase
                  ? "border-emerald-500/40 text-emerald-300"
                  : "border-[#26263a] text-[#5a5a72]"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {phase === 0 && (
        <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
          <h2 className="font-bold text-white">Create your creator account</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">Mock sign-up — no password needed.</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelCls}>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Brand name</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputCls} mt-1`} />
            </div>
          </div>
          <button
            onClick={() => setPhase(1)}
            disabled={!name.trim() || !brand.trim()}
            className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 1 && (
        <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
          <h2 className="font-bold text-white">Your niche and audience</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Niche</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className={`${inputCls} mt-1`}>
                {NICHES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Audience size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)} className={`${inputCls} mt-1`}>
                {SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={async () => {
              await saveCreatorProfile({ name, brand, niche, audienceSize: size });
              setPhase(2);
            }}
            className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 2 && (
        <div className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlanId(p.id);
                  setSeats(p.seats);
                }}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  planId === p.id
                    ? "border-violet-500/60 bg-violet-500/5"
                    : "border-[#26263a] bg-[#14141f] hover:border-[#3a3a55]"
                }`}
              >
                <div className="font-bold text-white">{p.name}</div>
                <div className="mt-1 text-xl font-black text-violet-300">${p.price}/mo</div>
                <div className="mt-1 text-xs text-[#9a9ab0]">{p.seats} member seats</div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
            <span className="text-sm text-[#9a9ab0]">Seats:</span>
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 5))}
              className="h-8 w-8 rounded-lg border border-[#26263a] text-white hover:border-violet-500/50"
            >
              −
            </button>
            <span className="w-10 text-center font-bold text-white">{seats}</span>
            <button
              onClick={() => setSeats((s) => s + 5)}
              className="h-8 w-8 rounded-lg border border-[#26263a] text-white hover:border-violet-500/50"
            >
              +
            </button>
          </div>
          <button
            onClick={async () => {
              if (!planId) return;
              await setCreatorPlan({ planTier: planId, seats, trial: false });
              setPhase(3);
            }}
            disabled={!planId}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Continue with {planId ?? "a plan"} (mock billing)
          </button>
          <button
            onClick={async () => {
              await setCreatorPlan({ planTier: "trial", seats: 5, trial: true });
              setPhase(3);
            }}
            className="w-full rounded-xl border border-emerald-500/40 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
          >
            or start a 14-day free trial
          </button>
        </div>
      )}

      {phase === 3 && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
            <h2 className="font-bold text-white">Upload knowledge (text)</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Paste essays, transcripts or notes — your twin learns from them. Already indexed:{" "}
              <span className="text-white">{knowledge.length}</span> documents.
            </p>
            <textarea
              value={knowledgeText}
              onChange={(e) => setKnowledgeText(e.target.value)}
              rows={5}
              placeholder="Paste text here (50+ characters)…"
              className={`${inputCls} mt-3`}
            />
            <button
              onClick={() => void addKnowledge()}
              disabled={knowledgeText.trim().length < 50 || adding}
              className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {adding ? "Adding…" : "Add to knowledge"}
            </button>
          </div>
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
            <h2 className="font-bold text-white">Upload assets</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Images, video or audio for your content. Library:{" "}
              <span className="text-white">{assets.length}</span> files (manage later in Assets).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="mt-3 block text-sm text-[#9a9ab0] file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAsset(f);
                e.target.value = "";
              }}
            />
          </div>
          <button
            onClick={() => setPhase(4)}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 4 && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
            <h2 className="font-bold text-white">Portal branding</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelCls}>Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className={labelCls}>Accent color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-[#26263a] bg-transparent"
                  />
                  <span className="font-mono text-sm text-[#9a9ab0]">{accent}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
            <h2 className="font-bold text-white">AI twin</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Personality</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={`${inputCls} mt-1`}>
                  {Object.entries(TONES).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Model (OpenRouter)</label>
                <input value={model} onChange={(e) => setModel(e.target.value)} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>AI disclosure (shown to subscribers)</label>
              <textarea
                value={disclosure}
                onChange={(e) => setDisclosure(e.target.value)}
                rows={2}
                className={`${inputCls} mt-1`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
            <h2 className="font-bold text-white">Gamification</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>XP per issue read</label>
                <input
                  value={xpRead}
                  onChange={(e) => setXpRead(Number(e.target.value) || 0)}
                  inputMode="numeric"
                  className={`${inputCls} mt-1`}
                />
              </div>
              <div>
                <label className={labelCls}>XP per twin question</label>
                <input
                  value={xpTwin}
                  onChange={(e) => setXpTwin(Number(e.target.value) || 0)}
                  inputMode="numeric"
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(toggles) as Array<keyof typeof toggles>).map((k) => (
                <button
                  key={k}
                  onClick={() => setToggles((t) => ({ ...t, [k]: !t[k] }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    toggles[k]
                      ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                      : "border-[#26263a] text-[#5a5a72]"
                  }`}
                >
                  {k.replace("enable", "")}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => void finishCustomize()}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 5 && (
        <div className="mt-6 rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-950/40 to-[#14141f] p-8 text-center">
          <h2 className="text-2xl font-black text-white">Ready to launch</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#9a9ab0]">
            {brand} · {niche} niche · {creator.planTier === "trial" ? "14-day trial" : `${planId} plan, ${seats} seats`}{" "}
            · {knowledge.length} knowledge docs · {tiers.length} subscriber tiers from{" "}
            {tiers[0] ? `${tiers[0].currency === "USD" ? "$" : "HK$"}${tiers[0].priceCents / 100}` : "—"}
            /mo
          </p>
          <button
            onClick={() => void launchCreator()}
            className="mt-6 rounded-xl bg-violet-600 px-10 py-4 text-base font-bold text-white transition-transform hover:scale-105 hover:bg-violet-500"
          >
            Launch {brand}
          </button>
          <p className="mt-3 text-xs text-[#5a5a72]">
            Next milestone: your first paying subscriber.
          </p>
        </div>
      )}
    </div>
  );
}
