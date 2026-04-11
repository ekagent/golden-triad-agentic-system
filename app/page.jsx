import StudioShell from "@/components/studio-shell";
import { getSafeCatalog, GOLDEN_RULE_TEXT } from "@/lib/catalog";
import { getHealthSnapshot } from "@/lib/health";
import { listRuns } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [historyResult, health, catalog] = await Promise.all([
    listRuns(12).then((history) => ({ history })).catch((error) => ({
      history: [],
      error: error instanceof Error ? error.message : "History storage is unavailable."
    })),
    getHealthSnapshot(),
    Promise.resolve(getSafeCatalog())
  ]);

  return (
    <StudioShell
      initialHistory={historyResult.history}
      initialHealth={health}
      initialHistoryError={historyResult.error || ""}
      catalog={catalog}
      goldenRule={GOLDEN_RULE_TEXT}
    />
  );
}
