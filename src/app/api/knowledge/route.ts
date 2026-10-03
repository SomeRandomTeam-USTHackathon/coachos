import {
  deleteKnowledge,
  insertKnowledge,
  listKnowledge,
  updateKnowledge,
} from "@/server/repo";
import type { KnowledgeDocMeta } from "@/lib/types";

export const runtime = "nodejs";

function docText(k: { keyPoints: string[]; body: string[] }): string {
  return [...k.keyPoints, ...k.body].join("\n");
}

// List all docs (?id= returns a single doc with its full plain text for editing).
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const doc = listKnowledge().find((k) => k.id === id);
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ doc, text: docText(doc) });
  }
  const docs: KnowledgeDocMeta[] = listKnowledge().map((k) => {
    const text = docText(k);
    return {
      id: k.id,
      title: k.title,
      chars: text.length,
      createdAt: k.createdAt,
      preview: text.slice(0, 160),
    };
  });
  return Response.json({ docs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    keyPoints?: string[];
    body?: string[];
  };
  if (!body.title?.trim() || !Array.isArray(body.body) || body.body.length === 0) {
    return Response.json({ error: "title and body are required" }, { status: 400 });
  }
  return Response.json(
    insertKnowledge({ title: body.title, keyPoints: body.keyPoints ?? [], body: body.body })
  );
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  if (!deleteKnowledge(id)) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; title?: string; text?: string };
  if (!body.id) return Response.json({ error: "id is required" }, { status: 400 });
  if (body.title === undefined && body.text === undefined) {
    return Response.json({ error: "title or text is required" }, { status: 400 });
  }
  const doc = updateKnowledge({ id: body.id, title: body.title, text: body.text });
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ doc });
}
