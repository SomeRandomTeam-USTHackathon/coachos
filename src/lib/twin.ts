import type { ChatSource, TwinConfig } from "./types";

export interface TwinAnswer {
  text: string;
  source?: string;
}

// Anything the twin can learn from: portal issues or training-only knowledge docs.
export interface CorpusDoc {
  id?: string;
  title: string;
  keyPoints: string[];
  body: string[];
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "for", "with", "without",
  "about", "into", "over", "under", "again", "further", "once", "here", "there", "when",
  "where", "why", "how", "what", "which", "who", "whom", "this", "that", "these", "those",
  "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
  "do", "does", "did", "doing", "would", "should", "could", "ought", "i", "you", "he",
  "she", "it", "we", "they", "them", "his", "her", "its", "our", "their", "my", "your",
  "me", "him", "us", "of", "at", "by", "from", "up", "down", "in", "out", "on", "off",
  "to", "as", "so", "than", "too", "very", "can", "will", "just", "not", "no", "yes",
]);

export const TONES: Record<string, { label: string; openers: string[]; closer: string }> = {
  energetic: {
    label: "Energetic coach",
    openers: [
      "Love this question.",
      "Great one — let's go.",
      "This is exactly the right thing to ask.",
    ],
    closer: "Now go do the thing.",
  },
  calm: {
    label: "Calm & analytical",
    openers: [
      "Good question. Let's break it down.",
      "Here's how I think about it.",
      "Let's look at this carefully.",
    ],
    closer: "Consistency over intensity — hope that helps.",
  },
  tough: {
    label: "Tough love",
    openers: ["Straight answer.", "No shortcuts here.", "Listen up."],
    closer: "Stop reading, start doing.",
  },
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export interface Chunk {
  docId: string;
  docTitle: string;
  text: string;
  weight: number;
}

export function buildChunks(corpus: CorpusDoc[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const doc of corpus) {
    const docId = doc.id ?? doc.title;
    for (const kp of doc.keyPoints)
      chunks.push({ docId, docTitle: doc.title, text: kp, weight: 1.5 });
    for (const p of doc.body) chunks.push({ docId, docTitle: doc.title, text: p, weight: 1 });
  }
  return chunks;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

// Keyword-overlap retrieval over the creator's corpus — the "creator-specific
// retrieval" layer; a shared model sits on top via aiComplete().
export function retrieve(question: string, corpus: CorpusDoc[], k = 5): ScoredChunk[] {
  const qTokens = [...new Set(tokenize(question))];
  if (qTokens.length === 0) return [];
  return buildChunks(corpus)
    .map((c) => {
      const cTokens = new Set(tokenize(c.text));
      let score = 0;
      for (const t of qTokens) if (cTokens.has(t)) score += c.weight;
      return { chunk: c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Shape the top retrieved chunks into citable sources for the explainability panel.
// Scores are normalized so the best chunk is 1.
export function toSources(scored: ScoredChunk[], k = 3): ChatSource[] {
  const top = scored.slice(0, k);
  const max = top[0]?.score ?? 1;
  return top.map((s) => ({
    docId: s.chunk.docId,
    title: s.chunk.docTitle,
    snippet: s.chunk.text.length > 160 ? `${s.chunk.text.slice(0, 157)}…` : s.chunk.text,
    score: Math.round((s.score / max) * 100) / 100,
  }));
}

// ---- lightweight emotional-tone memory ----

const TONE_SIGNALS: Array<{ tone: string; pattern: RegExp }> = [
  {
    tone: "frustrated",
    pattern:
      /\b(frustrat\w*|annoy\w*|stuck|not working|doesn'?t work|isn'?t working|hate|angry|useless|waste of|ridiculous|awful|terrible|give up)\b/i,
  },
  {
    tone: "celebratory",
    pattern:
      /\b(thanks|thank you|awesome|amazing|love (it|this)|it worked|nailed it|excited|glad|perfect|clicking|made sense|helped a lot)\b/i,
  },
  {
    tone: "curious",
    pattern: /\?|\b(wondering|curious|what if|could you explain|why does|how come)\b/i,
  },
];

// Derive a one-word "tone so far" from the subscriber's recent messages.
export function detectToneNote(recentUserTexts: string[]): string | null {
  const recent = recentUserTexts.slice(-6).join("\n");
  if (!recent.trim()) return null;
  for (const { tone, pattern } of TONE_SIGNALS) {
    if (pattern.test(recent)) return tone;
  }
  return null;
}

// ---- sensitive-topic handoff ----

const SENSITIVE_SIGNALS: Array<{ category: string; pattern: RegExp }> = [
  {
    category: "self-harm",
    pattern:
      /\b(self[- ]?harm|kill(ing)? myself|suicid\w*|end (my|it all)|want to die|hurting myself|cutting myself|no reason to live)\b/i,
  },
  {
    category: "medical emergency",
    pattern:
      /\b(overdos\w*|heart attack|can'?t breathe|cannot breathe|chest pain|severe bleeding|poison(?:ed|ing)?|unconscious|seizure)\b/i,
  },
  {
    category: "legal",
    pattern:
      /\b(lawsuit|sue(?:s|d|ing)?\b|legal action|attorney|lawyer|court order|subpoena|press charges|small claims)\b/i,
  },
];

// Returns a category label when a subscriber message needs a human, else null.
export function detectSensitive(text: string): string | null {
  for (const { category, pattern } of SENSITIVE_SIGNALS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

// A subtle one-phrase nod to the subscriber's recent emotional tone, used in
// place of the persona opener every so often. Kept honest — no fake empathy claims.
function toneOpener(toneNote: string | null | undefined): string | null {
  if (toneNote === "celebratory" && Math.random() < 0.5) return "Glad it's clicking —";
  if (toneNote === "frustrated" && Math.random() < 0.5) return "Fair question — let's sort it out.";
  return null;
}

// Swap this implementation for a real LLM API call later — the signature is the seam.
export function answer(
  question: string,
  corpus: CorpusDoc[],
  twin: TwinConfig,
  opts?: { toneNote?: string | null }
): TwinAnswer {
  const tone = TONES[twin.tone] ?? TONES.energetic;
  const opener = toneOpener(opts?.toneNote) ?? pick(tone.openers);
  if (corpus.length === 0) {
    return {
      text: `${twin.name} here — I haven't been trained on any content yet. Ask your coach to hit "Train" in the studio, then I'll have something to say.`,
    };
  }

  const qTokens = [...new Set(tokenize(question))];
  if (qTokens.length === 0) {
    return {
      text: `${pick(tone.openers)} Could you rephrase that? I'm at my best when the question has a few concrete keywords.`,
    };
  }

  const scored = retrieve(question, corpus, 50);

  if (scored.length === 0) {
    const topics = corpus.slice(0, 3).map((d) => `"${d.title}"`).join(", ");
    return {
      text: `${pick(tone.openers)} Honestly, I don't have a solid answer on that yet — my training currently covers ${topics}, and more. Try asking me something from those, or rephrase with different keywords.`,
    };
  }

  const best = scored[0];
  const second = scored.find((s) => s.chunk.docTitle !== best.chunk.docTitle);
  let text = `${opener} ${best.chunk.text}`;
  if (second && second.score >= best.score * 0.6) {
    text += ` Related, from another document: ${second.chunk.text}`;
  }
  text += ` ${tone.closer}`;
  return { text, source: best.chunk.docTitle };
}
