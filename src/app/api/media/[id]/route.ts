import { readMedia } from "@/server/repo";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = readMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  // Mock CDN behavior: immutable long-cache object delivery from object storage.
  return new Response(new Uint8Array(media.buf), {
    headers: {
      "Content-Type": media.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Coachos-Cdn": "mock-local-storage",
    },
  });
}
