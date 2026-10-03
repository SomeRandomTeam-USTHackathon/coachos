import { saveGamConfig } from "@/server/repo";
import type { GamConfig } from "@/lib/types";

export const runtime = "nodejs";

const NUMERIC_KEYS = ["xpReadIssue", "xpTwinQuestion", "xpDailyActive", "xpGhostListen"] as const;
const TOGGLE_KEYS = [
  "enableStreaks",
  "enableBadges",
  "enableLeaderboard",
  "enableTokens",
  "enableQuests",
] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const partial: Partial<GamConfig> = {};
  for (const k of NUMERIC_KEYS) {
    const v = body[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000) {
      partial[k] = Math.round(v);
    }
  }
  for (const k of TOGGLE_KEYS) {
    if (typeof body[k] === "boolean") partial[k] = body[k] as boolean;
  }
  return Response.json(saveGamConfig(partial));
}
