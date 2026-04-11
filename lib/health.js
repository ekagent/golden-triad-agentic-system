import { getCacheStatus } from "@/lib/cache";
import { getProviderStatus } from "@/lib/catalog";
import { listIntegrationRegistry } from "@/lib/integrations";
import { getPersistenceStatus } from "@/lib/storage";

export async function getHealthSnapshot() {
  const providers = getProviderStatus();
  const [persistence, cache] = await Promise.all([getPersistenceStatus(), getCacheStatus()]);
  const integrations = listIntegrationRegistry().map((entry) => {
    if (entry.id === "postgres") {
      return {
        ...entry,
        ready: persistence.ready,
        status: persistence.status,
        detail: persistence.detail
      };
    }

    if (entry.id === "redis") {
      return {
        ...entry,
        ready: cache.ready,
        status: cache.status,
        detail: cache.detail
      };
    }

    return {
      ...entry,
      ready: entry.configured,
      status: entry.configured ? "ready" : "missing",
      detail: entry.configured
        ? `${entry.label} is configured.`
        : `Set ${entry.envKeys.join(" or ")} to enable ${entry.label}.`
      };
  });

  const hasConfiguredProvider = Object.values(providers).some((provider) => provider.configured);
  const persistenceReady =
    persistence.status === "ready" ||
    (persistence.mode === "local-json" && process.env.NODE_ENV !== "production");

  return {
    ok: hasConfiguredProvider && persistenceReady && cache.status !== "error",
    providers,
    persistence,
    cache,
    integrations,
    timestamp: new Date().toISOString()
  };
}
