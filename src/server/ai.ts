import { getDb } from "./db";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function getSetting(key: string): string | null {
  const r = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return r?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}

export function isAiConfigured(): boolean {
  return !!getSetting("openrouter_key");
}

export function getModel(): string {
  return getSetting("openrouter_model") ?? DEFAULT_MODEL;
}

// Returns the model's reply, or null when no key is configured or the call
// fails — callers must have a local fallback. This is the seam for real AI.
export async function aiComplete(
  system: string,
  user: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const key = getSetting("openrouter_key");
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "http://localhost:3100",
        "X-Title": "CoachOS MVP",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: opts?.maxTokens ?? 600,
        temperature: opts?.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function aiTest(): Promise<{ ok: boolean; detail: string }> {
  const key = getSetting("openrouter_key");
  if (!key) return { ok: false, detail: "No OpenRouter key configured" };
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "http://localhost:3100",
        "X-Title": "CoachOS MVP",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [{ role: "user", content: "Reply with the single word: OK" }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { ok: true, detail: `Model ${getModel()} replied: ${data.choices?.[0]?.message?.content ?? "(empty)"}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
