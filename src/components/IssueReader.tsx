"use client";

import Link from "next/link";
import { canAccess } from "@/lib/access";
import { useStore } from "@/lib/store";
import AccessChip from "./AccessChip";
import { CheckIcon, KeyIcon, LockIcon } from "./icons";

export default function IssueReader({ issueId }: { issueId: string }) {
  const issues = useStore((s) => s.issues);
  const seasons = useStore((s) => s.seasons);
  const subscribed = useStore((s) => s.subscribed);
  const gam = useStore((s) => s.gam);
  const openCheckout = useStore((s) => s.openCheckout);
  const unlockArchive = useStore((s) => s.unlockArchive);
  const completeIssue = useStore((s) => s.completeIssue);

  const issue = issues.find((i) => i.id === issueId);

  if (!issue) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#9a9ab0]">Issue not found.</p>
        <Link href="/portal" className="mt-2 inline-block text-sm text-violet-300 hover:underline">
          Back to issues
        </Link>
      </div>
    );
  }

  const season = seasons.find((s) => s.id === issue.seasonId);
  const accessible = canAccess(issue, subscribed, gam.unlockedArchiveIds);
  const completed = gam.completedIssueIds.includes(issue.id);

  if (!accessible) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#26263a] bg-[#14141f]">
          <LockIcon className="h-6 w-6 text-[#9a9ab0]" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">{issue.title}</h1>
        <p className="mt-2 text-sm text-[#9a9ab0]">{issue.summary}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <AccessChip access={issue.access} />
          <span className="text-xs text-[#5a5a72]">{season?.title}</span>
        </div>

        {issue.access === "member" ? (
          <button
            onClick={openCheckout}
            className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Subscribe (mock) to unlock
          </button>
        ) : (
          <div className="mt-6">
            <button
              onClick={() => void unlockArchive(issue.id)}
              disabled={gam.tokens < 1}
              className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-2">
                <KeyIcon className="h-4 w-4" /> Unlock with 1 Token (you have {gam.tokens})
              </span>
            </button>
            {gam.tokens < 1 && (
              <p className="mt-2 text-xs text-[#9a9ab0]">
                Earn an Archive Unlock Token by holding a 7-day streak.
              </p>
            )}
          </div>
        )}

        <Link href="/portal" className="mt-6 block text-sm text-[#9a9ab0] hover:text-white">
          Back to all issues
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/portal" className="text-xs text-[#9a9ab0] hover:text-white">
        ← All issues
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <AccessChip access={issue.access} />
        <span className="text-xs text-[#5a5a72]">
          {season?.title} · {issue.publishedAt} · {issue.readMinutes} min read
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-black leading-tight text-white">{issue.title}</h1>
      <p className="mt-3 rounded-xl border border-[#26263a] bg-[#14141f] p-4 text-sm leading-relaxed text-[#c3c3d6]">
        {issue.summary}
      </p>

      <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-violet-300">Key points</h2>
        <ol className="mt-3 space-y-2">
          {issue.keyPoints.map((kp, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-[#e7e7f0]">
              <span className="font-bold text-violet-400">{i + 1}.</span>
              <span>{kp}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 space-y-4">
        {issue.body.map((p, i) => (
          <p key={i} className="leading-relaxed text-[#c3c3d6]">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-[#26263a] bg-[#14141f] p-6 text-center">
        {completed ? (
          <>
            <div className="inline-flex items-center gap-2 font-semibold text-emerald-300">
              <CheckIcon className="h-5 w-5" /> Completed — +50 XP earned
            </div>
            <p className="mt-2 text-sm text-[#9a9ab0]">Have questions about this issue?</p>
            <Link
              href="/portal/twin"
              className="mt-3 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              Ask the AI Twin
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-[#9a9ab0]">Finished reading? Bank your XP.</p>
            <button
              onClick={() => void completeIssue(issue.id)}
              className="mt-3 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
            >
              Mark as complete (+50 XP)
            </button>
          </>
        )}
      </div>
    </article>
  );
}
