import { structureSmart } from "@/server/structure";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { rawText?: string };
  if (!body.rawText || body.rawText.trim().length < 50) {
    return Response.json({ error: "rawText too short" }, { status: 400 });
  }
  return Response.json(await structureSmart(body.rawText));
}
