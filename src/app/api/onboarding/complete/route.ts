import { completeOnboarding } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { displayName?: string; completedStepIds?: string[] };
  return Response.json(
    completeOnboarding({
      displayName: body.displayName ?? "Member",
      completedStepIds: Array.isArray(body.completedStepIds) ? body.completedStepIds : [],
    })
  );
}
