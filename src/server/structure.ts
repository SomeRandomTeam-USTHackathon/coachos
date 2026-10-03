export interface StructureDraft {
  title: string;
  summary: string;
  keyPoints: string[];
  body: string[];
  readMinutes: number;
}

const TITLE_STOP = new Set(
  "the a an and or but so to of in on for with that this it is are was were be your you i we they them at as by from if not no do does did have has had will would can could should than then there here what when how why all one two out up about into over its it's".split(
    " "
  )
);

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Deterministic local stand-in for the AI clean/transcribe/structure step.
// Swap for a real transcription + LLM call later — the StructureDraft shape is the seam.
export function structure(raw: string): StructureDraft {
  const cleanPara = (p: string) =>
    p
      .replace(/\[.*?\]/g, " ")
      .replace(/\b(um+|uh+|like|you know|okay so|basically|actually|honestly|right\?)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const paragraphs = raw.split(/\n\s*\n/).map(cleanPara).filter((p) => p.length > 0);
  const cleanedAll = paragraphs.join(" ");
  const sentences = (cleanedAll.match(/[^.!?]+[.!?]+/g) ?? [cleanedAll]).map((s) => s.trim());
  const candidates = sentences.filter((s) => s.length >= 40 && s.length <= 180);

  const stride = Math.max(1, Math.floor(candidates.length / 5));
  const keyPoints: string[] = [];
  for (let i = 0; i < candidates.length && keyPoints.length < 5; i += stride) {
    keyPoints.push(candidates[i].replace(/[.!?]+$/, ""));
  }

  const topic = cleanedAll.match(
    /(?:talk(?:ing)? about|today'?s topic(?: is)?|topic(?: is)?)\s+([^,.!?]{3,48})/i
  );
  let title: string;
  if (topic) {
    title = titleCase(topic[1].trim());
  } else {
    const words = cleanedAll
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !TITLE_STOP.has(w));
    title = words.length ? titleCase(words.slice(0, 6).join(" ")) : "Untitled Issue";
  }

  const first = candidates[0] ?? cleanedAll;
  const summary = first.length > 160 ? `${first.slice(0, 157)}…` : first;

  let body = paragraphs;
  if (body.length < 2) {
    body = [];
    for (let i = 0; i < sentences.length; i += 3) body.push(sentences.slice(i, i + 3).join(" "));
  }

  const readMinutes = Math.max(1, Math.round(cleanedAll.split(/\s+/).filter(Boolean).length / 200));
  return { title, summary, keyPoints, body, readMinutes };
}

// Real LLM structuring via OpenRouter when a key is configured; falls back to
// the deterministic local implementation above otherwise.
export async function structureSmart(raw: string): Promise<StructureDraft & { ai: boolean }> {
  const deterministic = structure(raw);
  const { aiComplete } = await import("./ai");
  const out = await aiComplete(
    'You structure raw transcripts into a coaching content issue. Reply with STRICT JSON only, no markdown fences: {"title": string (max 8 words), "summary": string (max 40 words), "keyPoints": string[] (exactly 5, each max 20 words)}.',
    raw.slice(0, 8000),
    { maxTokens: 500, temperature: 0.4 }
  );
  if (!out) return { ...deterministic, ai: false };
  try {
    const parsed = JSON.parse(out.replace(/^```(?:json)?|```$/g, "").trim()) as {
      title?: string;
      summary?: string;
      keyPoints?: string[];
    };
    return {
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : deterministic.title,
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : deterministic.summary,
      keyPoints:
        Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
          ? parsed.keyPoints.map(String).slice(0, 6)
          : deterministic.keyPoints,
      body: deterministic.body,
      readMinutes: deterministic.readMinutes,
      ai: true,
    };
  } catch {
    return { ...deterministic, ai: false };
  }
}
