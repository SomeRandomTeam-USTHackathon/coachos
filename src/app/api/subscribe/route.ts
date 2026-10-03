import { getMemberProfile, subscribe } from "@/server/repo";
import type { PayProvider } from "@/lib/types";

export const runtime = "nodejs";

const PROVIDERS: PayProvider[] = ["stripe", "paypal", "googlepay", "octopus"];

export async function POST(request: Request) {
  const body = (await request.json()) as { tierId?: string | null; provider?: PayProvider };
  if (!body.provider || !PROVIDERS.includes(body.provider)) {
    return Response.json({ error: "a valid provider is required" }, { status: 400 });
  }
  subscribe(body.tierId ?? null, body.provider);
  return Response.json({ subscribed: true, member: getMemberProfile() });
}
