import { createTier } from "@/server/repo";
import type { Currency } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    priceCents?: number;
    currency?: Currency;
    perks?: string[];
  };
  if (!body.name?.trim() || !body.priceCents || body.priceCents <= 0) {
    return Response.json({ error: "name and a positive priceCents are required" }, { status: 400 });
  }
  if (body.currency !== "USD" && body.currency !== "HKD") {
    return Response.json({ error: "currency must be USD or HKD" }, { status: 400 });
  }
  return Response.json(
    createTier({
      name: body.name,
      priceCents: Math.round(body.priceCents),
      currency: body.currency,
      perks: Array.isArray(body.perks) ? body.perks.map(String) : [],
    })
  );
}
