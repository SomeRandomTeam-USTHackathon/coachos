import { listAssetsFull } from "@/server/repo";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(listAssetsFull());
}
