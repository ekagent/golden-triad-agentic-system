import { getProviderRuntime } from "@/lib/catalog";

const DEFAULT_PROVIDER_TIMEOUT_MS = 15000;
const MIN_PROVIDER_TIMEOUT_MS = 1000;

function extractText(payload) {
  const message = payload?.choices?.[0]?.message?.content;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.type === "text") {
          return item.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function resolveRequestTimeoutMs(options) {
  const timeoutCandidates = [
    typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs)
      ? options.timeoutMs
      : DEFAULT_PROVIDER_TIMEOUT_MS
  ];

  if (typeof options.deadlineMs === "number" && Number.isFinite(options.deadlineMs)) {
    timeoutCandidates.push(options.deadlineMs - Date.now());
  }

  return Math.floor(Math.min(...timeoutCandidates));
}

export async function generateFromLane(lane, messages, options = {}) {
  const runtime = getProviderRuntime(lane.providerId);

  if (!runtime.configured || !runtime.apiKey) {
    throw new Error(`${runtime.label} is not configured.`);
  }

  const attempts = [];

  for (const model of lane.providerModelCandidates) {
    const timeoutMs = resolveRequestTimeoutMs(options);

    if (timeoutMs < MIN_PROVIDER_TIMEOUT_MS) {
      attempts.push({
        model,
        ok: false,
        error: "Execution budget exceeded before provider request."
      });
      break;
    }

    const headers = {
      Authorization: `Bearer ${runtime.apiKey}`,
      "Content-Type": "application/json"
    };

    if (lane.providerId === "openrouter") {
      headers["HTTP-Referer"] = runtime.siteUrl;
      headers["X-Title"] = runtime.siteName;
    }

    const requestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0.35,
      max_tokens: options.maxTokens ?? 1400
    };

    const startedAt = Date.now();

    try {
      const response = await fetch(`${runtime.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        const reason = (await response.text()).slice(0, 240);
        attempts.push({
          model,
          ok: false,
          error: `${response.status} ${reason}`
        });
        continue;
      }

      const payload = await response.json();
      const text = extractText(payload);

      if (!text) {
        attempts.push({
          model,
          ok: false,
          error: "Empty response text"
        });
        continue;
      }

      return {
        model,
        output: text,
        attempts,
        usage: payload.usage || null,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      attempts.push({
        model,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown provider error"
      });
    }
  }

  throw new Error(
    `${runtime.label} failed for lane ${lane.label}. Tried: ${attempts
      .map((attempt) => attempt.model)
      .join(", ")}`
  );
}
