import { deleteTier, listTiers } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  deleteTier(body.id);
  return Response.json(listTiers());
}
