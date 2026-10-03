import { claimQuest } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { questId?: string };
  if (!body.questId) {
    return Response.json({ error: "questId is required" }, { status: 400 });
  }
  return Response.json(claimQuest(body.questId));
}
