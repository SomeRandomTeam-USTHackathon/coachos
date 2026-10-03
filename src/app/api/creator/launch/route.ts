import { setCreatorLaunched } from "@/server/repo";

export const runtime = "nodejs";

// Backwards compatible: an empty body or {} still launches (existing callers);
// { launched: false } unpublishes the portal.
export async function POST(request: Request) {
  let launched = true;
  try {
    const body = (await request.json()) as { launched?: boolean };
    if (typeof body.launched === "boolean") launched = body.launched;
  } catch {
    // no JSON body — treat as launch
  }
  return Response.json(setCreatorLaunched(launched));
}
