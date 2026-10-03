import { twinChat } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  if (!body.text?.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  return Response.json(await twinChat(body.text.trim()));
}
