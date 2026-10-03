import { isPortalThemeId } from "@/lib/portal";
import { savePortalCustomization } from "@/server/repo";

export const runtime = "nodejs";

// Saves /studio/customize edits: branding, theme skin and section layout in
// one shot, all onto the single creator row.
export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    brand?: string;
    tagline?: string;
    accent?: string;
    theme?: string | null;
    portalLayout?: unknown;
  };
  if (body.accent !== undefined && !/^#[0-9a-fA-F]{6}$/.test(body.accent)) {
    return Response.json({ error: "accent must be a #rrggbb color" }, { status: 400 });
  }
  if (body.theme !== undefined && body.theme !== null && !isPortalThemeId(body.theme)) {
    return Response.json({ error: "theme must be midnight | ember | abyss" }, { status: 400 });
  }
  return Response.json(savePortalCustomization(body));
}
