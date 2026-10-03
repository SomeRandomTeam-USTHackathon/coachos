import { resetAll } from "@/server/repo";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(resetAll());
}
