import { getBootstrap } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getBootstrap());
}
