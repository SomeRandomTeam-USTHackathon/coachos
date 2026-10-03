import { aiTest } from "@/server/ai";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(await aiTest());
}
