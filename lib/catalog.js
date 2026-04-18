import { getIntegrationConfig } from "./integrations.js";

const memoFast = process.env.MEMO_FAST_MODEL || process.env.MIMO_FAST_MODEL || "mimo-base";
const memoPro = process.env.MEMO_PRO_MODEL || process.env.MIMO_PRO_MODEL || "mimo-pro";

export const GOLDEN_RULE_TEXT =
  "Best performance, power, speed, accuracy, and efficiency at the lowest cost.";

export function getProviderStatus(userKeys = {}) {
  const glm = getIntegrationConfig("glm", userKeys);
  const memo = getIntegrationConfig("memo", userKeys);
  const openrouter = getIntegrationConfig("openrouter", userKeys);

  return {
    glm: {
      id: "glm",
      label: "GLM",
      configured: glm.configured,
      baseUrl: glm.baseUrl,
      mode: "primary direct provider"
    },
    memo: {
      id: "memo",
      label: "Memo",
      configured: memo.configured,
      baseUrl: memo.baseUrl,
      mode: "primary direct provider"
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      configured: openrouter.configured,
      baseUrl: openrouter.baseUrl,
      mode: "fallback only"
    },
    minimax: {
      id: "minimax",
      label: "Minimax",
      configured: getIntegrationConfig("minimax", userKeys).configured,
      baseUrl: getIntegrationConfig("minimax", userKeys).baseUrl,
      mode: "direct provider"
    },
    github: {
      id: "github",
      label: "GitHub",
      configured: getIntegrationConfig("github", userKeys).configured,
      baseUrl: getIntegrationConfig("github", userKeys).baseUrl,
      mode: "direct provider"
    }
  };
}

export function getProviderRuntime(providerId, userKeys = {}) {
  if (providerId === "glm") {
    const integration = getIntegrationConfig("glm", userKeys);
    return {
      id: integration.id,
      label: integration.label,
      configured: integration.configured,
      baseUrl: integration.baseUrl,
      mode: integration.mode,
      apiKey: integration.secretValue
    };
  }

  if (providerId === "memo") {
    const integration = getIntegrationConfig("memo", userKeys);
    return {
      id: integration.id,
      label: integration.label,
      configured: integration.configured,
      baseUrl: integration.baseUrl,
      mode: integration.mode,
      apiKey: integration.secretValue
    };
  }

  if (providerId === "minimax") {
    const integration = getIntegrationConfig("minimax", userKeys);
    return {
      id: integration.id,
      label: integration.label,
      configured: integration.configured,
      baseUrl: integration.baseUrl,
      mode: integration.mode,
      apiKey: integration.secretValue
    };
  }

  if (providerId === "github") {
    const integration = getIntegrationConfig("github", userKeys);
    return {
      id: integration.id,
      label: integration.label,
      configured: integration.configured,
      baseUrl: integration.baseUrl,
      mode: integration.mode,
      apiKey: integration.secretValue
    };
  }

  const integration = getIntegrationConfig("openrouter", userKeys);
  return {
    id: integration.id,
    label: integration.label,
    configured: integration.configured,
    baseUrl: integration.baseUrl,
    mode: integration.mode,
    apiKey: integration.secretValue,
    siteUrl: process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    siteName: process.env.OPENROUTER_SITE_NAME || "Golden Triad Agentic System"
  };
}

function lane(
  id,
  providerId,
  label,
  description,
  providerModelCandidates,
  metrics
) {
  const providerLabels = {
    glm: "GLM",
    memo: "Memo",
    openrouter: "OpenRouter",
    minimax: "Minimax",
    github: "GitHub"
  };
  const providerLabel = providerLabels[providerId] || providerId;

  return {
    id,
    providerId,
    providerLabel,
    label,
    description,
    defaultModel: providerModelCandidates[0],
    providerModelCandidates,
    metrics
  };
}

export function getLaneCatalog() {
  return [
    lane(
      "glm-fast",
      "glm",
      "GLM Fast",
      "Cheap direct GLM lane for planning, scaffolding, and fast build turns.",
      [process.env.GLM_FAST_MODEL || "glm-4.7-flash", "glm-4-flash", "glm-4-air"],
      {
        performance: 87,
        speed: 95,
        accuracy: 85,
        efficiency: 95,
        cheapness: 96,
        reasoning: 82,
        coding: 88
      }
    ),
    lane(
      "glm-balanced",
      "glm",
      "GLM Balanced",
      "Direct GLM lane for medium complexity work when speed and quality both matter.",
      [process.env.GLM_BALANCED_MODEL || "glm-4.5-air", "glm-4-plus", "glm-4"],
      {
        performance: 91,
        speed: 84,
        accuracy: 90,
        efficiency: 88,
        cheapness: 82,
        reasoning: 90,
        coding: 91
      }
    ),
    lane(
      "glm-power",
      "glm",
      "GLM Power",
      "Highest-power direct GLM lane for harder tasks and more exacting outputs.",
      [process.env.GLM_POWER_MODEL || "glm-4.7", "glm-4.5", "glm-4"],
      {
        performance: 97,
        speed: 68,
        accuracy: 96,
        efficiency: 75,
        cheapness: 58,
        reasoning: 97,
        coding: 95
      }
    ),
    lane(
      "memo-fast",
      "memo",
      "Memo Fast",
      "Fast direct Memo lane for fast execution when you want a cheaper non-GLM primary option.",
      [memoFast, "mimo-base"],
      {
        performance: 79,
        speed: 92,
        accuracy: 80,
        efficiency: 90,
        cheapness: 93,
        reasoning: 76,
        coding: 82
      }
    ),
    lane(
      "memo-pro",
      "memo",
      "Memo Pro",
      "Stronger direct Memo lane for balanced outputs and secondary review capacity.",
      [memoPro, "mimo-pro"],
      {
        performance: 88,
        speed: 84,
        accuracy: 87,
        efficiency: 84,
        cheapness: 79,
        reasoning: 88,
        coding: 87
      }
    ),
    lane(
      "or-fast",
      "openrouter",
      "OpenRouter Flash",
      "Cheap fallback lane using a fast non-GLM, non-Memo model family.",
      [
        process.env.OPENROUTER_FAST_MODEL || "google/gemini-2.5-flash",
        "google/gemini-2.5-flash-lite",
        process.env.OPENROUTER_SAFE_MODEL || "openai/gpt-4o-mini"
      ],
      {
        performance: 86,
        speed: 96,
        accuracy: 85,
        efficiency: 94,
        cheapness: 95,
        reasoning: 82,
        coding: 84
      }
    ),
    lane(
      "or-code",
      "openrouter",
      "OpenRouter Coder",
      "Fallback lane for coding-heavy work using a cheap coding-specialized family.",
      [
        process.env.OPENROUTER_CODE_MODEL || "qwen/qwen3-coder",
        "qwen/qwen3-30b-a3b-instruct",
        process.env.OPENROUTER_SAFE_MODEL || "openai/gpt-4o-mini"
      ],
      {
        performance: 92,
        speed: 82,
        accuracy: 90,
        efficiency: 86,
        cheapness: 84,
        reasoning: 89,
        coding: 96
      }
    ),
    lane(
      "or-reasoner",
      "openrouter",
      "OpenRouter Reasoner",
      "Fallback lane for harder reasoning and review passes with low relative cost.",
      [
        process.env.OPENROUTER_REASONER_MODEL || "deepseek/deepseek-chat-v3.1",
        "deepseek/deepseek-chat-v3-0324",
        process.env.OPENROUTER_SAFE_MODEL || "openai/gpt-4o-mini"
      ],
      {
        performance: 94,
        speed: 80,
        accuracy: 92,
        efficiency: 87,
        cheapness: 83,
        reasoning: 96,
        coding: 90
      }
    ),
    lane(
      "min-fast",
      "minimax",
      "Minimax Fast",
      "Fast direct Minimax lane for Chinese-market speed and efficiency.",
      [process.env.MINIMAX_FAST_MODEL || "abab6.5s-chat", "abab6.5-chat"],
      {
        performance: 88,
        speed: 94,
        accuracy: 86,
        efficiency: 92,
        cheapness: 90,
        reasoning: 84,
        coding: 85
      }
    ),
    lane(
      "min-power",
      "minimax",
      "Minimax Power",
      "Strongest direct Minimax lane for coding and complex reasoning.",
      [process.env.MINIMAX_POWER_MODEL || "abab7-chat", "abab6.5-chat"],
      {
        performance: 95,
        speed: 82,
        accuracy: 94,
        efficiency: 85,
        cheapness: 76,
        reasoning: 95,
        coding: 94
      }
    ),
    lane(
      "gh-chat",
      "github",
      "GitHub Chat",
      "Standard chat lane using high-quality models from GitHub marketplace.",
      [process.env.GITHUB_CHAT_MODEL || "gpt-4o-mini"],
      {
        performance: 89,
        speed: 91,
        accuracy: 88,
        efficiency: 93,
        cheapness: 97,
        reasoning: 87,
        coding: 86
      }
    ),
    lane(
      "gh-coder",
      "github",
      "GitHub Coder",
      "Power lane for elite coding using top models from GitHub marketplace.",
      [process.env.GITHUB_CODER_MODEL || "gpt-4o", "claude-3-5-sonnet"],
      {
        performance: 98,
        speed: 78,
        accuracy: 97,
        efficiency: 82,
        cheapness: 74,
        reasoning: 97,
        coding: 98
      }
    )
  ];
}

export function getSafeCatalog(userKeys = {}) {
  const status = getProviderStatus(userKeys);

  return getLaneCatalog().map((entry) => ({
    ...entry,
    configured: status[entry.providerId].configured
  }));
}
