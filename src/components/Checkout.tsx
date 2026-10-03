"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Currency, PayProvider, Tier } from "@/lib/types";

const FX = 7.8;

export function formatPrice(tier: Tier): string {
  const v = tier.priceCents / 100;
  return tier.currency === "USD" ? `$${v.toFixed(0)}` : `HK$${v.toFixed(0)}`;
}

export function fxHint(tier: Tier): string {
  const v = tier.priceCents / 100;
  return tier.currency === "USD" ? `≈ HK$${(v * FX).toFixed(0)}` : `≈ $${(v / FX).toFixed(1)} USD`;
}

const PROVIDERS: Array<{
  id: PayProvider;
  label: string;
  note: string;
  currencies?: Currency[];
}> = [
  { id: "stripe", label: "Stripe", note: "Visa / Mastercard" },
  { id: "paypal", label: "PayPal", note: "Balance or linked card" },
  { id: "googlepay", label: "Google Pay", note: "Cards via Google" },
  { id: "octopus", label: "八达通 Octopus", note: "拍卡或 App 支付", currencies: ["HKD"] },
];

export default function Checkout() {
  const open = useStore((s) => s.checkoutOpen);
  if (!open) return null;
  // Remounts fresh every time the modal opens — no manual state reset needed.
  return <CheckoutModal />;
}

function CheckoutModal() {
  const close = useStore((s) => s.closeCheckout);
  const tiers = useStore((s) => s.tiers);
  const subscribe = useStore((s) => s.subscribe);

  const [tierId, setTierId] = useState<string | null>(null);
  const [provider, setProvider] = useState<PayProvider | null>(null);
  const [phase, setPhase] = useState<"pick" | "processing" | "done">("pick");

  const tier = tiers.find((t) => t.id === tierId) ?? tiers[0];
  const providers = PROVIDERS.filter(
    (p) => !p.currencies || (tier && p.currencies.includes(tier.currency))
  );

  const pay = async () => {
    if (!tier || !provider) return;
    setPhase("processing");
    // Mock checkout — a real integration would redirect to the provider here.
    await new Promise((r) => setTimeout(r, 1200));
    await subscribe(tier.id, provider);
    setPhase("done");
    setTimeout(close, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#26263a] bg-[#14141f] p-6">
        {phase === "done" ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-300">
              ✓
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">Payment successful</h3>
            <p className="mt-1 text-sm text-[#9a9ab0]">Mock checkout — no real charge was made.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Choose your plan</h3>
              <button onClick={close} className="text-[#5a5a72] hover:text-white">
                ×
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTierId(t.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    (tierId ?? tiers[0]?.id) === t.id
                      ? "border-violet-500/60 bg-violet-500/5"
                      : "border-[#26263a] bg-[#10101c] hover:border-[#3a3a55]"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-white">{t.name}</span>
                    <span className="text-sm">
                      <span className="font-bold text-violet-300">{formatPrice(t)}</span>
                      <span className="ml-1 text-xs text-[#5a5a72]">/mo · {fxHint(t)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {t.perks.map((p) => (
                      <span key={p} className="text-xs text-[#9a9ab0]">
                        · {p}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <h4 className="mt-5 text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
              Payment method (mock)
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    provider === p.id
                      ? "border-violet-500/60 bg-violet-500/5"
                      : "border-[#26263a] bg-[#10101c] hover:border-[#3a3a55]"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{p.label}</div>
                  <div className="text-[11px] text-[#5a5a72]">{p.note}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => void pay()}
              disabled={!provider || phase === "processing"}
              className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              {phase === "processing"
                ? "Processing…"
                : tier
                  ? `Pay ${formatPrice(tier)} (mock)`
                  : "Select a plan"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
