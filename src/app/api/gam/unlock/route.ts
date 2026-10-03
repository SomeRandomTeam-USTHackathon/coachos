import { unlockArchive } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { issueId?: string };
  if (!body.issueId) {
    return Response.json({ error: "issueId is required" }, { status: 400 });
  }
  return Response.json(unlockArchive(body.issueId));
}
