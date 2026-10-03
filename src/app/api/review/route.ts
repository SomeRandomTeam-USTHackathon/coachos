import { getReviewState, reviewChatMessage, setHitlEnabled } from "@/server/repo";
import type { ReviewAction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getReviewState());
}

const ACTIONS: ReviewAction[] = ["approve", "edit", "reject"];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    hitlEnabled?: boolean;
    messageId?: string;
    action?: ReviewAction;
    editedAnswer?: string;
  };

  // Dashboard toggle: persist the HITL switch on its own.
  if (typeof body.hitlEnabled === "boolean" && body.messageId === undefined) {
    setHitlEnabled(body.hitlEnabled);
    return Response.json(getReviewState());
  }

  if (!body.messageId || !body.action || !ACTIONS.includes(body.action)) {
    return Response.json({ error: "messageId and a valid action are required" }, { status: 400 });
  }
  if (body.action === "edit" && !body.editedAnswer?.trim()) {
    return Response.json({ error: "editedAnswer is required for the edit action" }, { status: 400 });
  }

  const state = reviewChatMessage(body.messageId, body.action, body.editedAnswer);
  if (!state) {
    return Response.json({ error: "flagged message not found or already reviewed" }, { status: 404 });
  }
  return Response.json(state);
}
