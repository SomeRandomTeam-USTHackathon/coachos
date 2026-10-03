import { publishIssue, type PublishInput } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as PublishInput;
  if (!body.title?.trim() || !body.seasonId) {
    return Response.json({ error: "title and seasonId are required" }, { status: 400 });
  }
  return Response.json(publishIssue(body));
}
