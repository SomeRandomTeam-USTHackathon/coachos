import { replaceAssetImage } from "@/server/repo";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "file too large (max 25 MB in this MVP)" }, { status: 400 });
  }
  const mime = file.type || "image/png";
  if (!mime.startsWith("image/")) {
    return Response.json({ error: "only image replacements are supported" }, { status: 400 });
  }
  const result = replaceAssetImage(id, Buffer.from(await file.arrayBuffer()), mime);
  if (!result) return Response.json({ error: "image asset not found" }, { status: 404 });
  return Response.json(result);
}
