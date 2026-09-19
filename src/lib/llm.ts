import { z } from "zod";
import { formatZodError } from "./schemas";
import { friendlyNetworkMessage, LlmError } from "./errors";

/** Ordered fallbacks — avoid retired IDs (e.g. gemini-2.0-flash). */
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
];
const GROQ_MODELS = ["openai/gpt-oss-120b", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
const TIMEOUT_MS = 28_000;
const GEMINI_503_RETRIES = 2;
const GEMINI_503_BACKOFF_MS = 1_500;
const NETWORK_RETRIES = 2;
const NETWORK_BACKOFF_MS = 1_000;

export type LlmProvider = "gemini" | "groq";

function geminiKey(): string | undefined {
  return (
    process.env.LLM_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    undefined
  );
}

function groqKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export function getProvider(): LlmProvider | null {
  const prefer = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const hasGemini = Boolean(geminiKey());
  const hasGroq = Boolean(groqKey());

  if (prefer === "groq" && hasGroq) return "groq";
  if (prefer === "gemini" && hasGemini) return "gemini";
  if (hasGemini) return "gemini";
  if (hasGroq) return "groq";
  return null;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new LlmError("malformed", "The model did not return JSON.", true);
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new LlmError("malformed", "The model returned JSON we could not parse.", true);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  let lastNetwork: unknown;
  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new LlmError("timeout", "The model took too long. Your spec is unchanged — try again.", true);
      }
      lastNetwork = error;
      if (attempt < NETWORK_RETRIES) {
        await sleep(NETWORK_BACKOFF_MS * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  const message =
    friendlyNetworkMessage(lastNetwork) ??
    "Could not reach the model API. Retry — your filters and results are unchanged.";
  throw new LlmError("unknown", message, true);
}

function statusError(status: number, body: string): LlmError {
  if (status === 401 || status === 403) {
    return new LlmError("config", "The API key was rejected. Check GEMINI_API_KEY or GROQ_API_KEY.", false);
  }
  if (status === 429) {
    return new LlmError(
      "rate_limit",
      "The model is rate-limiting us. Wait a few seconds and retry — nothing was overwritten.",
      true,
    );
  }
  if (status === 503) {
    return new LlmError(
      "unknown",
      "Gemini is busy right now (high demand). Wait a few seconds and hit Retry — your filters and results are unchanged.",
      true,
    );
  }
  if (status >= 500) {
    return new LlmError("unknown", "The model provider had a server error. Retry without losing this session.", true);
  }
  if (status === 404) {
    return new LlmError("unknown", "That Gemini model is no longer available; trying the next model.", true);
  }
  return new LlmError("unknown", `Provider error ${status}: ${body.slice(0, 180)}`, true);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickBestLlmError(errors: LlmError[]): LlmError {
  const rank: Record<LlmError["code"], number> = {
    config: 0,
    rate_limit: 1,
    timeout: 2,
    malformed: 3,
    unknown: 4,
  };
  return [...errors].sort((a, b) => rank[a.code] - rank[b.code])[0];
}

async function completeGemini(system: string, user: string, model: string): Promise<string> {
  const key = geminiKey()!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  let body = "";
  let response: Response | undefined;
  for (let attempt = 0; attempt <= GEMINI_503_RETRIES; attempt++) {
    response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });
    body = await response.text();
    if (response.status === 503 && attempt < GEMINI_503_RETRIES) {
      await sleep(GEMINI_503_BACKOFF_MS * (attempt + 1));
      continue;
    }
    break;
  }
  if (!response!.ok) throw statusError(response!.status, body);
  const json = JSON.parse(body) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) {
    const blocked = json.promptFeedback?.blockReason;
    throw new LlmError("malformed", blocked ? `Gemini blocked the prompt (${blocked}).` : "Gemini returned an empty response.", true);
  }
  return text;
}

async function completeGroq(system: string, user: string, model: string): Promise<string> {
  const key = groqKey()!;
  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const body = await response.text();
  if (!response.ok) throw statusError(response.status, body);
  const json = JSON.parse(body) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) throw new LlmError("malformed", "Groq returned an empty response.", true);
  return text;
}

async function completeOnce(system: string, user: string): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new LlmError(
      "config",
      "No API key found. Set LLM_API_KEY (or GEMINI_API_KEY) or GROQ_API_KEY in .env.local.",
      false,
    );
  }
  const models = provider === "gemini" ? GEMINI_MODELS : GROQ_MODELS;
  const failures: LlmError[] = [];
  for (const model of models) {
    try {
      return provider === "gemini"
        ? await completeGemini(system, user, model)
        : await completeGroq(system, user, model);
    } catch (error) {
      if (error instanceof LlmError) {
        if (error.code === "config") throw error;
        failures.push(error);
      } else {
        const message =
          friendlyNetworkMessage(error) ??
          (error instanceof Error ? error.message : "Model request failed.");
        failures.push(new LlmError("unknown", message, true));
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[llm] ${provider}/${model} failed: ${failures[failures.length - 1]!.message}`);
      }
    }
  }
  if (failures.length > 0) throw pickBestLlmError(failures);
  throw new LlmError("unknown", "No model could complete the request.", true);
}

export async function completeJson<T>(options: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const first = await completeOnce(options.system, options.user);
  const parsed = options.schema.safeParse(extractJson(first));
  if (parsed.success) return parsed.data;

  const repairUser = `Your previous JSON failed validation:
${formatZodError(parsed.error)}

Return corrected JSON only. No markdown. Original request:

${options.user}

Invalid output:
${first.slice(0, 4000)}`;

  const second = await completeOnce(options.system, repairUser);
  const repaired = options.schema.safeParse(extractJson(second));
  if (repaired.success) return repaired.data;

  throw new LlmError(
    "malformed",
    "The model returned a spec we could not validate, even after a repair pass. Retry — the current filters were not overwritten.",
    true,
  );
}
