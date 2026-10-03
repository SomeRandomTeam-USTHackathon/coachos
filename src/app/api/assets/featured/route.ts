import { setAssetFeatured } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { mediaId?: string; featured?: boolean };
  if (!body.mediaId || typeof body.featured !== "boolean") {
    return Response.json({ error: "mediaId and featured (boolean) are required" }, { status: 400 });
  }
  const result = setAssetFeatured(body.mediaId, body.featured);
  if (!result) return Response.json({ error: "asset not found" }, { status: 404 });
  return Response.json(result);
}
