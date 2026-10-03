"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { formatPrice, fxHint } from "./Checkout";
import type { PayProvider } from "@/lib/types";

const PROVIDERS: Array<{ id: PayProvider; label: string; hkdOnly?: boolean }> = [
  { id: "stripe", label: "Stripe" },
  { id: "paypal", label: "PayPal" },
  { id: "googlepay", label: "Google Pay" },
  { id: "octopus", label: "八达通 Octopus", hkdOnly: true },
];

// First-run subscriber flow: welcome → pick tier (mock checkout inline) →
// creator-defined onboarding checklist → enter portal.
export default function OnboardingWizard() {
  const tiers = useStore((s) => s.tiers);
  const steps = useStore((s) => s.onboardingSteps);
  const creator = useStore((s) => s.creator);
  const subscribe = useStore((s) => s.subscribe);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const subscribed = useStore((s) => s.subscribed);

  const [phase, setPhase] = useState(0);
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);

  const finish = async () => {
    await completeOnboarding(name.trim() || "Member", checked);
  };

  const payWith = async (tierId: string, provider: PayProvider) => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900)); // mock checkout
    await subscribe(tierId, provider);
    setPaying(false);
    setPhase(2);
  };

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
        Welcome to {creator.brand}
      </div>
      <h1 className="mt-2 text-3xl font-black text-white">Let&apos;s get you set up</h1>

      <ol className="mt-4 flex gap-2 text-xs font-semibold">
        {["Account", "Plan", "Onboarding"].map((label, i) => (
          <li
            key={label}
            className={`rounded-full border px-3 py-1 ${
              i === phase
                ? "border-violet-500/60 text-violet-300"
                : i < phase
                  ? "border-emerald-500/40 text-emerald-300"
                  : "border-[#26263a] text-[#5a5a72]"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {phase === 0 && (
        <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
          <h2 className="font-bold text-white">Create your account</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            Mock sign-up for this demo — pick a display name, no password needed.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="mt-4 w-full rounded-xl border border-[#26263a] bg-[#10101c] px-4 py-3 text-sm text-white outline-none placeholder:text-[#5a5a72] focus:border-violet-500/60"
          />
          <button
            onClick={() => setPhase(1)}
            disabled={!name.trim()}
            className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 1 && (
        <div className="mt-6 space-y-3">
          {subscribed ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 text-sm text-emerald-300">
              You&apos;re subscribed ✓
              <button
                onClick={() => setPhase(2)}
                className="mt-3 block w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              {tiers.map((t) => (
                <div key={t.id} className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-white">{t.name}</span>
                    <span className="text-sm">
                      <span className="font-bold text-violet-300">{formatPrice(t)}</span>
                      <span className="ml-1 text-xs text-[#5a5a72]">/mo · {fxHint(t)}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PROVIDERS.filter((p) => !p.hkdOnly || t.currency === "HKD").map((p) => (
                      <button
                        key={p.id}
                        disabled={paying}
                        onClick={() => void payWith(t.id, p.id)}
                        className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/10 disabled:opacity-40"
                      >
                        {paying ? "…" : `${p.label} (mock)`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setPhase(2)}
                className="w-full rounded-xl border border-[#26263a] py-2.5 text-sm text-[#9a9ab0] transition-colors hover:text-white"
              >
                Skip — continue with free content
              </button>
            </>
          )}
        </div>
      )}

      {phase === 2 && (
        <div className="mt-6 rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
          <h2 className="font-bold text-white">Onboarding checklist</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">Set by your coach — check each to continue.</p>
          <div className="mt-4 space-y-2">
            {steps.map((s) => {
              const done = checked.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setChecked((c) => (done ? c.filter((x) => x !== s.id) : [...c, s.id]))
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
                    done
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300"
                      : "border-[#26263a] bg-[#10101c] text-white hover:border-[#3a3a55]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                      done ? "border-emerald-400 bg-emerald-500/20" : "border-[#3a3a55]"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => void finish()}
            disabled={checked.length < steps.length}
            className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            Enter the portal
          </button>
        </div>
      )}
    </div>
  );
}
