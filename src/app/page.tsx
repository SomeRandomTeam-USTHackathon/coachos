"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BoltIcon, ChatIcon, StarIcon } from "@/components/icons";

export default function Landing() {
  const router = useRouter();
  const setRole = useStore((s) => s.setRole);

  const enter = (role: "creator" | "member", href: string) => {
    setRole(role);
    router.push(href);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-16">
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-violet-400">
          CoachOS.ai — MVP Demo
        </div>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
          Turn raw content into a{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            gamified membership
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[#9a9ab0]">
          Creators publish structured seasons of content in minutes. Members learn through an
          AI twin, earn XP, hold streaks, and climb the leaderboard. Everything in this demo runs
          locally in your browser.
        </p>
      </div>

      <div className="mt-12 grid w-full gap-4 sm:grid-cols-2">
        <button
          onClick={() => enter("creator", "/studio")}
          className="group rounded-2xl border border-[#26263a] bg-[#14141f] p-6 text-left transition-all hover:border-violet-500/60 hover:bg-[#171726]"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-[#9a9ab0]">
            Enter as Creator
          </div>
          <div className="mt-2 text-2xl font-bold text-white">Creator Studio</div>
          <p className="mt-2 text-sm text-[#9a9ab0]">
            Clean, transcribe and structure raw media with one text command, publish season
            issues, and train your AI twin.
          </p>
          <div className="mt-4 text-sm font-semibold text-violet-300 group-hover:translate-x-1 transition-transform">
            Open Studio →
          </div>
        </button>

        <button
          onClick={() => enter("member", "/portal")}
          className="group rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-950/40 to-[#14141f] p-6 text-left transition-all hover:border-violet-400/70"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-violet-300">
            Enter as Member
          </div>
          <div className="mt-2 text-2xl font-bold text-white">Member Portal</div>
          <p className="mt-2 text-sm text-[#b9b9cf]">
            Read season issues, chat with Twin Alex, complete daily quests, and unlock the
            archive with Tokens.
          </p>
          <div className="mt-4 text-sm font-semibold text-violet-300 group-hover:translate-x-1 transition-transform">
            Open Portal →
          </div>
        </button>
      </div>

      <div className="mt-12 grid w-full gap-3 sm:grid-cols-3">
        {[
          { icon: BoltIcon, title: "Content Pipeline", text: "Mock AI cleans, transcribes and structures raw media into publishable issues." },
          { icon: ChatIcon, title: "AI Digital Twin", text: "Answers member questions from the creator's published content, with sources." },
          { icon: StarIcon, title: "Gamified Progress", text: "XP, levels, streaks, quests, badges, tokens and a live community leaderboard." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-[#26263a] bg-[#10101c] p-4">
            <f.icon className="h-5 w-5 text-violet-400" />
            <div className="mt-2 text-sm font-bold text-white">{f.title}</div>
            <div className="mt-1 text-xs leading-relaxed text-[#9a9ab0]">{f.text}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
