import { listGhostMemos, listNotifications, queueGhostFollowup } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { memoId?: string };
  if (!body.memoId) {
    return Response.json({ error: "memoId is required" }, { status: 400 });
  }
  const memo = await queueGhostFollowup(body.memoId);
  if (!memo) return Response.json({ error: "memo not found" }, { status: 404 });
  return Response.json({ memo, memos: listGhostMemos(), notifications: listNotifications() });
}
