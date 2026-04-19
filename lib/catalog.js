import { getIntegrationConfig } from "./integrations.js";

const mimoFast = process.env.MIMO_FAST_MODEL || "mimo-base";
const mimoPro = process.env.MIMO_PRO_MODEL || "mimo-pro";

export const GOLDEN_RULE_TEXT =
  "Best performance, power, speed, accuracy, and efficiency at the lowest cost.";

export function getProviderStatus(userKeys = {}) {
  const glm = getIntegrationConfig("glm", userKeys);
  const mimo = getIntegrationConfig("mimo", userKeys);
  const openrouter = getIntegrationConfig("openrouter", userKeys);

  return {
    glm: {
      id: "glm",
      label: "GLM",
      configured: glm.configured,
      baseUrl: glm.baseUrl,
      mode: "primary direct provider"
    },
    mimo: {
      id: "mimo",
      label: "Mimo",
      configured: mimo.configured,
      baseUrl: mimo.baseUrl,
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
    },
    mcp: {
      id: "mcp",
      label: "MCP",
      configured: getIntegrationConfig("mcp", userKeys).configured,
      baseUrl: getIntegrationConfig("mcp", userKeys).baseUrl,
      mode: "custom tools"
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

  if (providerId === "mimo") {
    const integration = getIntegrationConfig("mimo", userKeys);
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
    mimo: "Mimo",
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
      "mimo-fast",
      "mimo",
      "Mimo Fast",
      "Fast direct Mimo lane for quick execution when you need speed at lowest cost.",
      [mimoFast, "mimo-base"],
      {
        performance: 82,
        speed: 94,
        accuracy: 82,
        efficiency: 92,
        cheapness: 95,
        reasoning: 78,
        coding: 84
      }
    ),
    lane(
      "mimo-pro",
      "mimo",
      "Mimo Pro",
      "Stronger direct Mimo lane for balanced outputs and secondary review capacity.",
      [mimoPro, "mimo-pro"],
      {
        performance: 90,
        speed: 84,
        accuracy: 88,
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
      "Cheap fallback lane using a fast non-GLM, non-Mimo model family.",
      [
        "google/gemini-2.5-flash",
        "openai/gpt-4o-mini",
        "google/gemini-2.5-flash-lite"
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
        "google/gemini-2.5-flash",
        "openai/gpt-4o-mini",
        "anthropic/claude-3-haiku"
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
