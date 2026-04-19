import { getProviderRuntime } from "./catalog.js";

const DEFAULT_PROVIDER_TIMEOUT_MS = 25000;
const MIN_PROVIDER_TIMEOUT_MS = 3000;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 2;

class FatalProviderError extends Error {}

function extractResponse(payload) {
  const message = payload?.choices?.[0]?.message;
  let text = "";

  if (typeof message?.content === "string") {
    text = message.content;
  } else if (Array.isArray(message?.content)) {
    text = message.content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text;
        return "";
      })
      .join("\n")
      .trim();
  }

  return {
    text,
    tool_calls: message?.tool_calls || null
  };
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

function extractProviderErrorMessage(rawText) {
  if (!rawText) {
    return "Unknown provider error";
  }

  try {
    const payload = JSON.parse(rawText);
    return payload?.error?.message || payload?.message || rawText;
  } catch {
    return rawText;
  }
}

function formatAttemptError(attempt) {
  return `${attempt.model} (${attempt.error})`;
}

function buildAuthHelp(runtime) {
  if (runtime.id === "openrouter") {
    return "Update OPENROUTER_API_KEY or your saved OpenRouter key in Dashboard > Settings, or clear the saved field to fall back to the platform key.";
  }

  if (runtime.id === "glm") {
    return "Update GLM_API_KEY or your saved GLM key in Dashboard > Settings.";
  }

  if (runtime.id === "mimo") {
    return "Update MIMO_API_KEY or your saved Mimo key in Dashboard > Settings.";
  }

  if (runtime.id === "minimax") {
    return "Update MINIMAX_API_KEY or your saved MiniMax key in Dashboard > Settings.";
  }

  return "Update the provider API key in your environment or Dashboard > Settings.";
}

function summarizeAttempts(attempts) {
  if (!attempts.length) {
    return "";
  }

  return attempts.map(formatAttemptError).join("; ");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(status, errorMsg) {
  if (status >= 500) return true;
  if (status === 429) return true;
  if (/rate limit|timeout|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(errorMsg)) return true;
  return false;
}

export async function generateFromLane(lane, messages, options = {}) {
  const runtime = getProviderRuntime(lane.providerId, options.userKeys || {});

  if (!runtime.configured || !runtime.apiKey) {
    throw new Error(`${runtime.label} is not configured.`);
  }

  const attempts = [];
  let lastError = null;

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

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      if (options.tool_choice) {
        requestBody.tool_choice = options.tool_choice;
      }
    }

    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      if (retry > 0) {
        await delay(RETRY_DELAY_MS * retry);
      }

      const startedAt = Date.now();

      try {
        const response = await fetch(`${runtime.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (!response.ok) {
          const reason = extractProviderErrorMessage((await response.text()).slice(0, 1000)).slice(0, 240);
          const attemptError = `${response.status} ${reason}`.trim();
          attempts.push({
            model,
            ok: false,
            error: attemptError
          });
          lastError = attemptError;

          if (response.status === 401 || response.status === 403) {
            throw new FatalProviderError(
              `${runtime.label} authentication failed for lane ${lane.label}: ${attemptError}. ${buildAuthHelp(runtime)}`
            );
          }

          if (response.status === 402) {
            throw new FatalProviderError(
              `${runtime.label} billing or credit check failed for lane ${lane.label}: ${attemptError}. Add credits or review account limits before retrying.`
            );
          }

          if (!isRetryableError(response.status, attemptError)) {
            break;
          }

          continue;
        }

        const payload = await response.json();
        const responseData = extractResponse(payload);

        if (!responseData.text && (!responseData.tool_calls || responseData.tool_calls.length === 0)) {
          attempts.push({
            model,
            ok: false,
            error: "Empty response text and no tool calls"
          });
          continue;
        }

        return {
          model,
          output: responseData.text,
          tool_calls: responseData.tool_calls,
          attempts,
          usage: payload.usage || null,
          latencyMs: Date.now() - startedAt
        };
      } catch (error) {
        if (error instanceof FatalProviderError) {
          throw error;
        }

        const errMsg = error instanceof Error ? error.message : "Unknown provider error";
        attempts.push({ model, ok: false, error: errMsg });
        lastError = errMsg;

        const isRetryable = /timeout|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(errMsg);
        if (!isRetryable) break;
      }
    }
  }

  throw new Error(
    `${runtime.label} failed for lane ${lane.label}. Attempts: ${summarizeAttempts(attempts)}`
  );
}
