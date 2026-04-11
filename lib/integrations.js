const REGISTRY = {
  glm: {
    id: "glm",
    label: "GLM",
    kind: "provider",
    envKeys: ["GLM_API_KEY"],
    baseUrlEnv: ["GLM_BASE_URL"],
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    mode: "primary direct provider"
  },
  memo: {
    id: "memo",
    label: "Memo",
    kind: "provider",
    envKeys: ["MEMO_API_KEY", "MIMO_API_KEY"],
    baseUrlEnv: ["MEMO_BASE_URL", "MIMO_BASE_URL"],
    defaultBaseUrl: "https://api.mimo.ai/v1",
    mode: "primary direct provider"
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    kind: "provider",
    envKeys: ["OPENROUTER_API_KEY"],
    baseUrlEnv: ["OPENROUTER_BASE_URL"],
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    mode: "fallback only"
  },
  postgres: {
    id: "postgres",
    label: "Postgres",
    kind: "persistence",
    envKeys: ["DATABASE_URL"],
    mode: "durable run history"
  },
  redis: {
    id: "redis",
    label: "Redis",
    kind: "cache",
    envKeys: ["REDIS_URL"],
    mode: "response cache"
  }
};

function truthy(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function readFirst(keys) {
  for (const key of keys) {
    if (truthy(process.env[key])) {
      return {
        key,
        value: process.env[key]
      };
    }
  }

  return {
    key: null,
    value: ""
  };
}

export function getIntegrationConfig(id) {
  const definition = REGISTRY[id];

  if (!definition) {
    throw new Error(`Unknown integration: ${id}`);
  }

  const secret = readFirst(definition.envKeys || []);
  const baseUrl = definition.baseUrlEnv?.length
    ? readFirst(definition.baseUrlEnv).value || definition.defaultBaseUrl || ""
    : "";

  return {
    ...definition,
    configured: truthy(secret.value),
    secretEnvKey: secret.key,
    secretValue: secret.value,
    baseUrl,
    missingEnvKeys: truthy(secret.value) ? [] : definition.envKeys.slice()
  };
}

export function listIntegrationRegistry() {
  return Object.keys(REGISTRY).map((id) => {
    const integration = getIntegrationConfig(id);

    return {
      id: integration.id,
      label: integration.label,
      kind: integration.kind,
      configured: integration.configured,
      mode: integration.mode,
      baseUrl: integration.baseUrl || null,
      envKeys: integration.envKeys,
      missingEnvKeys: integration.missingEnvKeys
    };
  });
}
