"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AccessChip from "@/components/AccessChip";
import EngagementHeatmap from "@/components/EngagementHeatmap";
import ReviewQueue from "@/components/ReviewQueue";
import { useStore } from "@/lib/store";
import type { AnalyticsReport } from "@/lib/types";

const DAY_MS = 24 * 3600 * 1000;

function formatMoney(currency: string, cents: number): string {
  const amt = (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency === "USD" ? `$${amt}` : currency === "HKD" ? `HK$${amt}` : `${amt} ${currency}`;
}

export default function StudioDashboard() {
  const issues = useStore((s) => s.issues);
  const seasons = useStore((s) => s.seasons);
  const twin = useStore((s) => s.twin);
  const subscribed = useStore((s) => s.subscribed);
  const creator = useStore((s) => s.creator);
  const resetDemoApi = useStore((s) => s.resetDemo);
  const launchCreator = useStore((s) => s.launchCreator);
  const twinStats = useStore((s) => s.twinStats);
  const untrained = issues.filter((i) => !twin.trainedIssueIds.includes(i.id)).length;
  const [mountTime] = useState(() => Date.now());
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((a: AnalyticsReport) => !cancelled && setAnalytics(a))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const trialDaysLeft = creator.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(creator.trialEndsAt).getTime() - mountTime) / DAY_MS))
    : null;

  const resetDemo = () => {
    if (!window.confirm("Reset all demo data (content, XP, subscription) back to the seed state?")) return;
    void resetDemoApi().then(() => window.location.reload());
  };

  const mrrLabel = !analytics
    ? "—"
    : analytics.mrr.length === 0
      ? "$0"
      : analytics.mrr.map((m) => formatMoney(m.currency, m.amountCents)).join(" + ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Welcome back, {creator.name}</h1>
        <p className="mt-1 text-sm text-[#9a9ab0]">
          {creator.niche} niche · {subscribed ? "You are viewing the portal as a subscribed member." : "You are previewing as a free visitor."}
        </p>
      </div>

      {trialDaysLeft !== null && trialDaysLeft > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-300">
          <span className="font-bold">{trialDaysLeft} days left</span> in your free trial (mock
          billing — pick a plan anytime from Settings).
        </div>
      )}

      {!creator.launched ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-950/50 to-[#14141f] p-6">
          <div>
            <h2 className="text-lg font-bold text-white">Your portal is ready to launch</h2>
            <p className="mt-1 text-sm text-[#9a9ab0]">
              Content, twin and pricing are set. Launch to open {creator.brand} to members.
            </p>
          </div>
          <button
            onClick={() => void launchCreator()}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 hover:bg-violet-500"
          >
            Launch {creator.brand}
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl border p-6 ${
            creator.firstSubscriberAt
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-[#26263a] bg-[#14141f]"
          }`}
        >
          {creator.firstSubscriberAt ? (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Milestone unlocked
              </div>
              <h2 className="mt-1 text-lg font-bold text-white">
                First paying subscriber acquired
              </h2>
              <p className="mt-1 text-sm text-[#9a9ab0]">
                {new Date(creator.firstSubscriberAt).toLocaleString()} — the flywheel has started.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white">Waiting for your first paying subscriber</h2>
              <p className="mt-1 text-sm text-[#9a9ab0]">
                Share your portal link — the moment someone subscribes, it shows up here.
              </p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
          <div className="text-2xl font-black text-white">
            {analytics ? String(analytics.subscribers.active) : "—"}
          </div>
          <div className="mt-1 text-xs text-[#9a9ab0]">Members</div>
        </div>
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
          <div className="text-2xl font-black text-white">{mrrLabel}</div>
          <div className="mt-1 text-xs text-[#9a9ab0]">Est. MRR</div>
          {analytics && (
            <div className="mt-1 text-[10px] text-[#5a5a72]">
              {analytics.commissionPct}% platform fee · You keep {100 - analytics.commissionPct}%
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
          <div className="text-2xl font-black text-white">{issues.length}</div>
          <div className="mt-1 text-xs text-[#9a9ab0]">Issues published</div>
        </div>
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
          <div className="text-2xl font-black text-white">{seasons.length}</div>
          <div className="mt-1 text-xs text-[#9a9ab0]">Seasons</div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-white">Growth &amp; retention</h2>
          <a
            href="/api/analytics/export"
            className="rounded-xl border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
          >
            Export report (CSV)
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
            <div className="text-2xl font-black text-white">
              {analytics ? String(analytics.engagement.activeLast7d) : "—"}
            </div>
            <div className="mt-1 text-xs text-[#9a9ab0]">Active last 7 days</div>
          </div>
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
            <div className="text-2xl font-black text-white">
              {analytics ? analytics.engagement.totalXp.toLocaleString() : "—"}
            </div>
            <div className="mt-1 text-xs text-[#9a9ab0]">Total XP issued</div>
          </div>
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
            <div
              className={`text-2xl font-black ${
                analytics && analytics.churnRisk.count > 0 ? "text-amber-300" : "text-white"
              }`}
            >
              {analytics ? String(analytics.churnRisk.count) : "—"}
            </div>
            <div className="mt-1 text-xs text-[#9a9ab0]">Churn risk (&gt;7d inactive)</div>
            {analytics && analytics.churnRisk.count > 0 && (
              <div className="mt-1 truncate text-[10px] text-amber-300/80">
                {analytics.churnRisk.names.slice(0, 5).join(", ")}
                {analytics.churnRisk.names.length > 5 && ` +${analytics.churnRisk.names.length - 5} more`}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-4">
            <div className="text-2xl font-black text-white">
              {!analytics
                ? "—"
                : analytics.ghost.responseRate === null
                  ? "—"
                  : `${Math.round(analytics.ghost.responseRate * 100)}%`}
            </div>
            <div className="mt-1 text-xs text-[#9a9ab0]">Ghost response rate</div>
            {analytics && (
              <div className="mt-1 text-[10px] text-[#5a5a72]">
                {analytics.ghost.replies} replies / {analytics.ghost.memosSent} memos sent
              </div>
            )}
          </div>
        </div>
      </div>

      {analytics && <EngagementHeatmap days={analytics.heatmap} />}

      <ReviewQueue />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <h2 className="font-bold text-white">Content pipeline</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            Drop raw media, give one text command, get a structured issue ready to publish.
          </p>
          <Link
            href="/studio/pipeline"
            className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            New content
          </Link>
        </div>

        <div className="rounded-2xl border border-[#26263a] bg-[#14141f] p-5">
          <h2 className="font-bold text-white">{twin.name}</h2>
          <p className="mt-1 text-sm text-[#9a9ab0]">
            Trained on {twinStats.issues} issues + {twinStats.knowledge} knowledge docs ·{" "}
            {twinStats.chunks} chunks
            {twin.trainedAt ? ` · last trained ${new Date(twin.trainedAt).toLocaleDateString()}` : ""}
          </p>
          {untrained > 0 && (
            <p className="mt-2 text-xs font-semibold text-amber-300">
              {untrained} new issue{untrained > 1 ? "s" : ""} not yet trained — retrain to teach the twin.
            </p>
          )}
          <Link
            href="/studio/twin"
            className="mt-4 inline-block rounded-xl border border-violet-500/50 px-4 py-2.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
          >
            Configure twin
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-white">Published issues</h2>
        <div className="overflow-hidden rounded-2xl border border-[#26263a]">
          {issues.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3 border-b border-[#1d1d2e] bg-[#10101c] px-4 py-3 last:border-0"
            >
              <AccessChip access={i.access} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{i.title}</div>
                <div className="text-xs text-[#5a5a72]">
                  {seasons.find((s) => s.id === i.seasonId)?.title} · {i.publishedAt}
                </div>
              </div>
              <Link href={`/portal/issue/${i.id}`} className="text-xs text-violet-300 hover:underline">
                Preview
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1d1d2e] pt-6">
        <button onClick={resetDemo} className="text-xs text-[#5a5a72] hover:text-red-400">
          Reset demo data
        </button>
      </div>
    </div>
  );
}
