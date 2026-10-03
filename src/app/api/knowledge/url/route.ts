import { insertKnowledge } from "@/server/repo";
import { structureSmart } from "@/server/structure";

export const runtime = "nodejs";

const MAX_CHARS = 20_000;
const MAX_DOWNLOAD = 1_000_000;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// Crude HTML → plain text: drop script/style, turn block-level tags into
// newlines, strip the rest. Good enough for article/blog imports.
function htmlToText(html: string): { pageTitle: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() || null : null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<\/(p|div|section|article|main|header|h[1-6]|li|ul|ol|blockquote|tr|table|figure)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const clean = decodeEntities(text)
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { pageTitle, text: clean };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  let url: URL;
  try {
    url = new URL(body.url?.trim() ?? "");
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Response.json({ error: "Only http(s) URLs can be imported" }, { status: 400 });
  }

  let raw: string;
  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
      headers: {
        "User-Agent": "CoachOS knowledge importer",
        Accept: "text/html,text/plain,*/*",
      },
    });
    if (!res.ok) {
      return Response.json({ error: `The site responded with HTTP ${res.status}` }, { status: 502 });
    }
    raw = await res.text();
  } catch {
    return Response.json(
      { error: "Couldn't fetch that URL — it may be unreachable or blocking imports" },
      { status: 502 }
    );
  }

  const { pageTitle, text } = htmlToText(raw.slice(0, MAX_DOWNLOAD));
  const capped = text.slice(0, MAX_CHARS);
  if (capped.length < 50) {
    return Response.json(
      { error: "Not enough readable text found on that page" },
      { status: 422 }
    );
  }

  const structured = await structureSmart(capped);
  const doc = insertKnowledge({
    title: pageTitle ?? (structured.title !== "Untitled Issue" ? structured.title : url.hostname),
    keyPoints: structured.keyPoints,
    body: structured.body,
  });
  return Response.json({ doc, chars: capped.length, truncated: text.length > MAX_CHARS });
}
