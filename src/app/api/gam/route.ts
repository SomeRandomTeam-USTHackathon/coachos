import { freezeStreak, getGamDepth, prestigeMember, repairStreak } from "@/server/gamdepth";

export const runtime = "nodejs";

// Gamification depth (PRD 6.2.3): GET returns the reconciled depth state;
// POST performs one action — {action:'freeze'}, {action:'repair', method},
// {action:'prestige'} — and returns the fresh depth state each time.
export async function GET() {
  return Response.json(getGamDepth());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    method?: string;
  };
  switch (body.action) {
    case "freeze":
      return Response.json(freezeStreak());
    case "repair":
      if (body.method !== "xp" && body.method !== "token") {
        return Response.json({ error: "method must be 'xp' or 'token'" }, { status: 400 });
      }
      return Response.json(repairStreak(body.method));
    case "prestige":
      return Response.json(await prestigeMember());
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}
