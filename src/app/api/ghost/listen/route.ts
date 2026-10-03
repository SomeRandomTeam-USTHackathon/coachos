import { markGhostListened } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { memoId?: string };
  if (!body.memoId) {
    return Response.json({ error: "memoId is required" }, { status: 400 });
  }
  return Response.json(markGhostListened(body.memoId));
}
