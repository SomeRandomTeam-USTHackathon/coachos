import { setCreatorPlan } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { planTier?: string; seats?: number; trial?: boolean };
  if (!body.planTier?.trim() || !body.seats || body.seats < 1) {
    return Response.json({ error: "planTier and seats >= 1 are required" }, { status: 400 });
  }
  return Response.json(
    setCreatorPlan({
      planTier: body.planTier.trim(),
      seats: Math.round(body.seats),
      trial: body.trial === true,
    })
  );
}
