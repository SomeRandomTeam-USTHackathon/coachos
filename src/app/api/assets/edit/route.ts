import { editAssetMock, removeAssetEdit } from "@/server/repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { mediaId?: string; command?: string };
  if (!body.mediaId || !body.command?.trim()) {
    return Response.json({ error: "mediaId and command are required" }, { status: 400 });
  }
  const result = editAssetMock(body.mediaId, body.command.trim());
  if (!result) return Response.json({ error: "asset not found" }, { status: 404 });
  return Response.json(result);
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { mediaId?: string; editId?: string };
  if (!body.mediaId || !body.editId) {
    return Response.json({ error: "mediaId and editId are required" }, { status: 400 });
  }
  const edits = removeAssetEdit(body.mediaId, body.editId);
  if (!edits) return Response.json({ error: "asset not found" }, { status: 404 });
  return Response.json({ id: body.mediaId, edits });
}
