import { updateCreatorProfile } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    brand?: string;
    tagline?: string;
    accent?: string;
    niche?: string;
    audienceSize?: string;
  };
  if (body.accent && !/^#[0-9a-fA-F]{6}$/.test(body.accent)) {
    return Response.json({ error: "accent must be a #rrggbb color" }, { status: 400 });
  }
  return Response.json(updateCreatorProfile(body));
}
