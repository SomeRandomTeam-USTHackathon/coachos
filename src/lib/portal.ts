// ---- portal customization studio (PRD 6.1.4) ----
// Shared module imported by both the member portal and the studio customize
// page: dark-variant theme token sets, portal home section definitions and
// portal_layout JSON helpers. Keep this file free of client/server-only APIs.

import type { PortalLayout, PortalSectionId, PortalThemeId } from "./types";

// sessionStorage flag marking the current browser tab as the creator's own
// preview, so an unpublished portal stays viewable via "View as Member".
export const CREATOR_PREVIEW_KEY = "coachos_creator_preview";

// A theme is a set of Tailwind class tokens applied on top of the creator's
// accent color (accent stays an inline-style hex and composes with any theme).
export interface PortalTheme {
  id: PortalThemeId;
  name: string;
  blurb: string;
  pageBg: string; // hex applied to the page background
  swatch: [string, string, string]; // picker chips: page / card / suggestion
  header: string; // sticky header bar: border + translucent bg
  card: string; // raised card surface
  cardHover: string; // card hover surface
  soft: string; // inset surface
  stat: string; // translucent stat tile inside the hero
  border: string; // default hairline border
  track: string; // progress-bar track
  muted: string; // secondary text
  faint: string; // tertiary text
  hero: string; // hero banner gradient stops (used with bg-gradient-to-br)
  chipActive: string; // active nav pill background
}

// Midnight reproduces the pre-existing hardcoded look exactly — it is the
// default, so existing portals render unchanged until the creator picks a skin.
export const PORTAL_THEMES: PortalTheme[] = [
  {
    id: "midnight",
    name: "Midnight",
    blurb: "The classic CoachOS night — deep violet-tinted surfaces.",
    pageBg: "#0b0b14",
    swatch: ["#0b0b14", "#14141f", "#8b5cf6"],
    header: "border-[#26263a] bg-[#0b0b14]/90",
    card: "bg-[#14141f]",
    cardHover: "hover:bg-[#171726]",
    soft: "bg-[#10101c]",
    stat: "bg-[#0b0b14]/60",
    border: "border-[#26263a]",
    track: "bg-[#26263a]",
    muted: "text-[#9a9ab0]",
    faint: "text-[#5a5a72]",
    hero: "from-violet-950/50 via-[#14141f] to-[#10101c]",
    chipActive: "bg-[#1d1d2e]",
  },
  {
    id: "ember",
    name: "Ember",
    blurb: "Warm zinc surfaces with an amber glow.",
    pageBg: "#14110d",
    swatch: ["#14110d", "#1f1a14", "#f59e0b"],
    header: "border-[#353029] bg-[#14110d]/90",
    card: "bg-[#1f1a14]",
    cardHover: "hover:bg-[#26201a]",
    soft: "bg-[#191510]",
    stat: "bg-[#14110d]/60",
    border: "border-[#353029]",
    track: "bg-[#353029]",
    muted: "text-[#b0a696]",
    faint: "text-[#6f675b]",
    hero: "from-amber-950/40 via-[#1f1a14] to-[#191510]",
    chipActive: "bg-[#2c261e]",
  },
  {
    id: "abyss",
    name: "Abyss",
    blurb: "Blue-tinted slate, calm and deep.",
    pageBg: "#090e1a",
    swatch: ["#090e1a", "#101a30", "#38bdf8"],
    header: "border-[#263450] bg-[#090e1a]/90",
    card: "bg-[#101a30]",
    cardHover: "hover:bg-[#14203a]",
    soft: "bg-[#0d1526]",
    stat: "bg-[#090e1a]/60",
    border: "border-[#263450]",
    track: "bg-[#263450]",
    muted: "text-[#93a3c2]",
    faint: "text-[#54638a]",
    hero: "from-sky-950/50 via-[#101a30] to-[#0d1526]",
    chipActive: "bg-[#1a2742]",
  },
];

export const DEFAULT_THEME_ID: PortalThemeId = "midnight";

export function isPortalThemeId(v: unknown): v is PortalThemeId {
  return v === "midnight" || v === "ember" || v === "abyss";
}

export function themeById(id: string | null | undefined): PortalTheme {
  return PORTAL_THEMES.find((t) => t.id === id) ?? PORTAL_THEMES[0];
}

export interface PortalSectionDef {
  id: PortalSectionId;
  name: string;
  blurb: string;
}

export const PORTAL_SECTIONS: PortalSectionDef[] = [
  { id: "hero", name: "Hero", blurb: "Brand banner with level, XP, streak and tokens." },
  { id: "ghost", name: "Ghost inbox", blurb: "Voice memos from the coach (self-hides when empty)." },
  { id: "issues", name: "Issues", blurb: "Seasons and published issues grid." },
  { id: "twin", name: "AI Twin CTA", blurb: "Call-to-action card linking to the twin chat." },
  { id: "progress", name: "Progress", blurb: "Gamification summary linking to quests and badges." },
  { id: "gallery", name: "Gallery", blurb: "Featured media pushed from the studio asset library." },
];

export function defaultPortalLayout(): PortalLayout {
  return { order: PORTAL_SECTIONS.map((s) => s.id), hidden: [] };
}

// Stored layout → render order: known ids in stored order first, unknown ids
// dropped, missing sections appended in definition order.
export function resolveSectionOrder(layout: PortalLayout | null | undefined): PortalSectionId[] {
  const known = PORTAL_SECTIONS.map((s) => s.id);
  const seen = new Set<PortalSectionId>();
  const out: PortalSectionId[] = [];
  for (const id of layout?.order ?? []) {
    const sid = id as PortalSectionId;
    if ((known as string[]).includes(id) && !seen.has(sid)) {
      seen.add(sid);
      out.push(sid);
    }
  }
  for (const id of known) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export function visibleSections(layout: PortalLayout | null | undefined): PortalSectionId[] {
  const hidden = new Set(layout?.hidden ?? []);
  return resolveSectionOrder(layout).filter((id) => !hidden.has(id));
}

// Defensive normalizer for the portal_layout JSON column / API payload.
// Keeps any string ids (forward-compatible) but guarantees shape; returns
// null when the input isn't a usable layout object.
export function normalizeLayout(raw: unknown): PortalLayout | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const clean = (v: unknown): string[] =>
    Array.isArray(v)
      ? [...new Set(v.filter((x): x is string => typeof x === "string"))].slice(0, 32)
      : [];
  return { order: clean(r.order), hidden: clean(r.hidden) };
}
