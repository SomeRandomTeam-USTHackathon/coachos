import { attachCoachMemo, listGhostMemos, saveMedia } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const memoId = form.get("memoId");
  const audio = form.get("audio");
  if (typeof memoId !== "string" || !(audio instanceof File)) {
    return Response.json({ error: "memoId and audio file are required" }, { status: 400 });
  }
  const duration = Number(form.get("duration")) || undefined;
  const media = saveMedia({
    kind: "ghost-coach",
    raw: Buffer.from(await audio.arrayBuffer()),
    mime: audio.type || "audio/webm",
    durationSec: duration,
  });
  attachCoachMemo(memoId, media.id);
  return Response.json({ mediaId: media.id, processed: media.processed, memos: listGhostMemos() });
}
