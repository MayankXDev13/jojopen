/* Bring-your-own-key AI transport. Requests go straight to the chosen provider. */

export const AI_META: Record<
  string,
  { label: string; sub: string; model: string }
> = {
  anthropic: {
    label: "Anthropic",
    sub: "Claude · recommended",
    model: "claude-sonnet-4-20250514",
  },
  openai: { label: "OpenAI", sub: "GPT models", model: "gpt-4o-mini" },
  google: { label: "Google", sub: "Gemini models", model: "gemini-2.0-flash" },
  "openai-compatible": {
    label: "Compatible",
    sub: "OpenRouter, Ollama, LM Studio…",
    model: "openrouter/auto",
  },
};

export const AI_KEY = "jojopen.ai.v1";

export type AIConfig = {
  provider?: string;
  model?: string;
  baseUrl?: string;
  keys?: Record<string, string>;
};

export const SYSTEM_PROMPT = `You are JojoPen's diagram assistant, working on the user's whiteboard.
You create and edit diagrams and slide decks. Layout, colors and routing are automatic.

Reply with JSON only, no markdown:
{"reply":"one or two short sentences","actions":[{"type":"diagram","title":"...","dsl":"..."} | {"type":"deck","slides":[{"layout":"title|section|bullets|diagram|diagram-bullets","title":"...","subtitle":"...","bullets":["..."],"diagram":"..."}]}]}

JojoPen diagram language:
- Header: title: Name, direction: right|left|down|up
- Nodes: User [person], Orders DB [cylinder], Stripe [external], API [aws/api-gateway, "Public API"]
- Shapes: rectangle rounded ellipse diamond cylinder document person (aliases box circle decision database doc user)
- Roles: actor network compute data cache messaging security external neutral
- Edges: A -> B (sync), A --> B (async), A <-> B, A -.-> B (optional), A -- B (plain)
- Edge labels: A -> B: label. Chains A -> B -> C. Fan-out A -> B, C. Fan-in A, B -> C.
- Groups: group Backend { A  B } (nests)
- Comments: // text. Never write colors, coordinates or sizes.
Keep node labels to 3 words or fewer and diagrams to 12 nodes or fewer. Put diagram slides on layout "diagram" or "diagram-bullets".`;

export function loadAIConfig(): AIConfig {
  try {
    return JSON.parse(localStorage.getItem(AI_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveAIConfig(cfg: AIConfig) {
  localStorage.setItem(AI_KEY, JSON.stringify(cfg));
}

export type AITarget = {
  provider: string;
  meta: { label: string; sub: string; model: string };
  model: string;
  key: string;
  baseUrl: string;
};

export function currentAI(
  fallbackProvider = "anthropic",
  fallbackModel = "",
): AITarget {
  const cfg = loadAIConfig();
  const provider = cfg.provider || fallbackProvider;
  const meta = AI_META[provider] || AI_META.anthropic;
  return {
    provider,
    meta,
    model: cfg.model || fallbackModel || meta.model,
    key: cfg.keys?.[provider] || "",
    baseUrl: cfg.baseUrl || "",
  };
}

export function extractJSON(txt: unknown): string {
  let s = String(txt).trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return s;
}

export async function callAI(
  ai: AITarget,
  text: string,
  history: string,
  signal: AbortSignal,
): Promise<string> {
  const cfg = loadAIConfig();
  const prompt = history ? `${history}\nUser: ${text}` : text;
  if (ai.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": ai.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ai.model,
        max_tokens: 2400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await r.json();
    if (!r.ok)
      throw new Error(j?.error?.message || `Anthropic error ${r.status}`);
    return j.content?.map((c: { text: string }) => c.text).join("") || "";
  }
  if (ai.provider === "google") {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}:generateContent?key=${encodeURIComponent(ai.key)}`,
      {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Google error ${r.status}`);
    return (
      j.candidates?.[0]?.content?.parts
        ?.map((p: { text: string }) => p.text)
        .join("") || ""
    );
  }
  const base =
    ai.provider === "openai-compatible"
      ? cfg.baseUrl || "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1";
  const r = await fetch(base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ai.key}`,
    },
    body: JSON.stringify({
      model: ai.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Provider error ${r.status}`);
  return j.choices?.[0]?.message?.content || "";
}
