"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { levelFor } from "@/lib/gamification";
import { CREATOR_PREVIEW_KEY, themeById } from "@/lib/portal";
import { useStore } from "@/lib/store";
import { FlameIcon, KeyIcon, StarIcon } from "./icons";

const NAVS: Record<"studio" | "portal", Array<{ href: string; label: string }>> = {
  studio: [
    { href: "/studio", label: "Dashboard" },
    { href: "/studio/pipeline", label: "Content Pipeline" },
    { href: "/studio/twin", label: "AI Twin" },
    { href: "/studio/ghost", label: "Ghost" },
    { href: "/studio/assets", label: "Assets" },
    { href: "/studio/customize", label: "Customize" },
    { href: "/studio/settings", label: "Settings" },
  ],
  portal: [
    { href: "/portal", label: "Issues" },
    { href: "/portal/twin", label: "AI Twin" },
    { href: "/portal/progress", label: "Progress" },
  ],
};

export default function AppHeader({ variant }: { variant: "studio" | "portal" }) {
  const pathname = usePathname();
  const gam = useStore((s) => s.gam);
  const creator = useStore((s) => s.creator);
  const gamConfig = useStore((s) => s.gamConfig);
  const subscribed = useStore((s) => s.subscribed);
  const { level } = levelFor(gam.xp);
  const isStudio = variant === "studio";
  const accent = creator.accent ?? "#8b5cf6";
  // Portal header follows the creator's chosen skin; the studio keeps the
  // default Midnight chrome.
  const theme = themeById(isStudio ? null : creator.theme);

  return (
    <header className={`sticky top-0 z-40 border-b ${theme.header} backdrop-blur`}>
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href={isStudio ? "/studio" : "/portal"} className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black text-white"
            style={{ backgroundColor: accent }}
          >
            {creator.brand[0] ?? "C"}
          </span>
          <span className="text-sm font-bold tracking-wide text-white">
            {isStudio ? "CoachOS Studio" : `${creator.brand} Portal`}
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {NAVS[variant].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? `${theme.chipActive} text-white` : `${theme.muted} hover:text-white`
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {!isStudio && (
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className={`flex items-center gap-1 rounded-full border ${theme.border} ${theme.card} px-2.5 py-1 text-xs font-semibold text-amber-300`}
            >
              <StarIcon className="h-3.5 w-3.5" /> Lv {level}
            </span>
            {gamConfig.enableStreaks && (
              <span
                className={`flex items-center gap-1 rounded-full border ${theme.border} ${theme.card} px-2.5 py-1 text-xs font-semibold text-orange-400`}
              >
                <FlameIcon className="h-3.5 w-3.5" /> {gam.streak}
              </span>
            )}
            {gamConfig.enableTokens && (
              <span
                className={`flex items-center gap-1 rounded-full border ${theme.border} ${theme.card} px-2.5 py-1 text-xs font-semibold text-sky-300`}
              >
                <KeyIcon className="h-3.5 w-3.5" /> {gam.tokens}
              </span>
            )}
            {subscribed && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                Member
              </span>
            )}
          </div>
        )}

        <Link
          href={isStudio ? "/portal" : "/studio"}
          onClick={() => {
            // Single-tenant demo gate: "View as Member" marks this tab as the
            // creator's own preview, so an unpublished portal stays viewable.
            try {
              if (isStudio) window.sessionStorage.setItem(CREATOR_PREVIEW_KEY, "1");
              else window.sessionStorage.removeItem(CREATOR_PREVIEW_KEY);
            } catch {
              // sessionStorage unavailable — portal falls back to member view
            }
          }}
          className="rounded-lg border border-violet-500/50 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
        >
          {isStudio ? "View as Member" : "View as Creator"}
        </Link>
      </div>
    </header>
  );
}
