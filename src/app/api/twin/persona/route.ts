import { saveTwinPersona } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    tone?: string;
    greeting?: string;
    disclosure?: string;
  };
  if (!body.name?.trim() || !body.tone || body.greeting === undefined) {
    return Response.json({ error: "name, tone and greeting are required" }, { status: 400 });
  }
  return Response.json(
    saveTwinPersona({
      name: body.name.trim(),
      tone: body.tone,
      greeting: body.greeting,
      disclosure: body.disclosure,
    })
  );
}
