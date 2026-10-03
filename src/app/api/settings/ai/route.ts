import { deleteSetting, getModel, isAiConfigured, setSetting } from "@/server/ai";

export const runtime = "nodejs";

// Saves AI settings. The key is write-only: it is never returned by any endpoint.
export async function POST(request: Request) {
  const body = (await request.json()) as { key?: string; model?: string };
  if (body.key !== undefined) {
    if (body.key.trim()) setSetting("openrouter_key", body.key.trim());
    else deleteSetting("openrouter_key");
  }
  if (body.model !== undefined) {
    if (body.model.trim()) setSetting("openrouter_model", body.model.trim());
    else deleteSetting("openrouter_model");
  }
  return Response.json({ configured: isAiConfigured(), model: getModel() });
}
