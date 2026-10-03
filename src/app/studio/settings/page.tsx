"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Currency } from "@/lib/types";

export default function SettingsPage() {
  const ai = useStore((s) => s.ai);
  const tiers = useStore((s) => s.tiers);
  const onboardingSteps = useStore((s) => s.onboardingSteps);
  const saveAiSettings = useStore((s) => s.saveAiSettings);
  const testAi = useStore((s) => s.testAi);
  const createTier = useStore((s) => s.createTier);
  const deleteTier = useStore((s) => s.deleteTier);
  const saveOnboardingSteps = useStore((s) => s.saveOnboardingSteps);

  const [key, setKey] = useState("");
  const [model, setModel] = useState(ai.model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [tierCurrency, setTierCurrency] = useState<Currency>("USD");
  const [tierPerks, setTierPerks] = useState("");

  const [stepsText, setStepsText] = useState(onboardingSteps.map((s) => s.label).join("\n"));

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await testAi();
    setTestResult(`${r.ok ? "OK" : "FAILED"} — ${r.detail}`);
    setTesting(false);
  };

  const addTier = async () => {
    const price = Math.round(parseFloat(tierPrice) * 100);
    if (!tierName.trim() || !Number.isFinite(price) || price <= 0) return;
    await createTier({
      name: tierName,
      priceCents: price,
      currency: tierCurrency,
      perks: tierPerks.split(",").map((p) => p.trim()).filter(Boolean),
    });
    setTierName("");
    setTierPrice("");
    setTierPerks("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Settings</h1>

      <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">AI — OpenRouter (BYO key)</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
              ai.configured
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300"
            }`}
          >
            {ai.configured ? "Connected" : "Mock mode"}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#9a9ab0]">
          Paste your own OpenRouter key to power the twin, pipeline structuring and Ghost
          summaries with a real model. The key is stored server-side only and never sent back to
          the browser. Without a key, everything runs in deterministic mock mode.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
              OpenRouter API key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={ai.configured ? "•••••••• (saved — enter new to replace)" : "sk-or-…"}
              className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
              Model
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="openai/gpt-4o-mini"
              className="mt-1 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void saveAiSettings(key, model)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Save AI settings
          </button>
          {ai.configured && (
            <>
              <button
                onClick={() => void runTest()}
                disabled={testing}
                className="rounded-xl border border-[#26263a] px-4 py-2 text-sm text-[#9a9ab0] transition-colors hover:text-white disabled:opacity-40"
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
              <button
                onClick={() => void saveAiSettings("", model)}
                className="text-xs text-[#5a5a72] hover:text-red-400"
              >
                Remove key
              </button>
            </>
          )}
        </div>
        {testResult && <p className="mt-3 text-xs text-[#9a9ab0]">{testResult}</p>}
      </section>

      <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
        <h2 className="font-bold text-white">Subscription tiers</h2>
        <p className="mt-1 text-sm text-[#9a9ab0]">
          USD and HKD supported (display FX at 7.8). Checkout providers: Stripe / PayPal / Google
          Pay / 八达通 — all simulated in this MVP.
        </p>
        <div className="mt-4 space-y-2">
          {tiers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-[#10101c] px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-white">{t.name}</span>
                <span className="ml-2 text-xs text-[#9a9ab0]">
                  {t.currency === "USD" ? `$${t.priceCents / 100}` : `HK$${t.priceCents / 100}`}/mo ·{" "}
                  {t.perks.join(" · ")}
                </span>
              </div>
              <button
                onClick={() => void deleteTier(t.id)}
                className="text-xs text-[#5a5a72] hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px_100px]">
          <input
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
            placeholder="Tier name (e.g. Annual)"
            className="rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <input
            value={tierPrice}
            onChange={(e) => setTierPrice(e.target.value)}
            placeholder="Price"
            inputMode="decimal"
            className="rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <select
            value={tierCurrency}
            onChange={(e) => setTierCurrency(e.target.value as Currency)}
            className="rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60"
          >
            <option value="USD">USD</option>
            <option value="HKD">HKD</option>
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={tierPerks}
            onChange={(e) => setTierPerks(e.target.value)}
            placeholder="Perks, comma separated"
            className="flex-1 rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <button
            onClick={() => void addTier()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Add tier
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
        <h2 className="font-bold text-white">Onboarding checklist</h2>
        <p className="mt-1 text-sm text-[#9a9ab0]">
          One step per line — new subscribers complete these before entering the portal.
        </p>
        <textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          rows={4}
          className="mt-3 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
        />
        <button
          onClick={() => void saveOnboardingSteps(stepsText.split("\n"))}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Save steps
        </button>
      </section>
    </div>
  );
}
