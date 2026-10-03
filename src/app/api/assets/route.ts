import { saveAsset } from "@/server/repo";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "file too large (max 25 MB in this MVP)" }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!/^(image|video|audio)\//.test(mime)) {
    return Response.json({ error: "only image, video and audio files are supported" }, { status: 400 });
  }
  const asset = saveAsset(Buffer.from(await file.arrayBuffer()), mime);
  return Response.json(asset);
}
