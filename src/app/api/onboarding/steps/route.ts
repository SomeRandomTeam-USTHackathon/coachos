import { saveOnboardingSteps } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { steps?: string[] };
  if (!Array.isArray(body.steps)) {
    return Response.json({ error: "steps must be a string array" }, { status: 400 });
  }
  return Response.json(saveOnboardingSteps(body.steps));
}
