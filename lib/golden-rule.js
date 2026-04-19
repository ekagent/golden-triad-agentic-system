import { getLaneCatalog, getProviderStatus } from "./catalog.js";

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function analyzeTask(task) {
  const value = task.toLowerCase();
  const length = task.trim().length;

  let taskType = "general";

  if (/(build|code|api|ui|frontend|backend|deploy|fix|refactor|app)/.test(value)) {
    taskType = "build";
  } else if (/(research|compare|analy[sz]e|market|pricing|competitor)/.test(value)) {
    taskType = "analysis";
  } else if (/(write|email|copy|draft|brand)/.test(value)) {
    taskType = "writing";
  }

  let complexity = "medium";

  if (length < 220 && !/(system|architecture|multi|deploy|host|database|agent)/.test(value)) {
    complexity = "simple";
  }

  if (length > 850 || /(architecture|orchestrate|multi-agent|deploy|infrastructure|database|hosting)/.test(value)) {
    complexity = "complex";
  }

  return {
    taskType,
    complexity,
    rawLength: length
  };
}

function computePower(lane, taskType) {
  if (taskType === "build") {
    return average([lane.metrics.reasoning, lane.metrics.coding, lane.metrics.performance]);
  }

  if (taskType === "analysis") {
    return average([lane.metrics.reasoning, lane.metrics.accuracy, lane.metrics.performance]);
  }

  return average([lane.metrics.reasoning, lane.metrics.accuracy, lane.metrics.efficiency]);
}

function phaseWeights(phase, objective) {
  const golden = {
    architect: { performance: 0.16, power: 0.18, speed: 0.24, accuracy: 0.14, efficiency: 0.16, cheapness: 0.12 },
    builder: { performance: 0.24, power: 0.24, speed: 0.12, accuracy: 0.17, efficiency: 0.11, cheapness: 0.12 },
    reviewer: { performance: 0.2, power: 0.18, speed: 0.12, accuracy: 0.24, efficiency: 0.1, cheapness: 0.16 }
  };

  const speed = {
    architect: { performance: 0.1, power: 0.14, speed: 0.28, accuracy: 0.12, efficiency: 0.18, cheapness: 0.18 },
    builder: { performance: 0.18, power: 0.18, speed: 0.24, accuracy: 0.14, efficiency: 0.14, cheapness: 0.12 },
    reviewer: { performance: 0.16, power: 0.16, speed: 0.22, accuracy: 0.16, efficiency: 0.14, cheapness: 0.16 }
  };

  const power = {
    architect: { performance: 0.2, power: 0.22, speed: 0.14, accuracy: 0.16, efficiency: 0.12, cheapness: 0.16 },
    builder: { performance: 0.28, power: 0.28, speed: 0.08, accuracy: 0.18, efficiency: 0.08, cheapness: 0.1 },
    reviewer: { performance: 0.22, power: 0.24, speed: 0.08, accuracy: 0.24, efficiency: 0.08, cheapness: 0.14 }
  };

  if (objective === "speed") {
    return speed[phase];
  }

  if (objective === "power") {
    return power[phase];
  }

  return golden[phase];
}

function directProviderPriority(providerId, providerMode) {
  if (providerId === "openrouter") {
    return -8;
  }

  if (providerMode === "glm-first") {
    return providerId === "glm" ? 5 : 2;
  }

  if (providerMode === "mimo-first") {
    return providerId === "mimo" ? 5 : 2;
  }

  return providerId === "glm" ? 4 : 3;
}

function scoreLane(lane, analysis, phase, objective, providerMode, providerStatus) {
  if (!providerStatus[lane.providerId]?.configured) {
    return null;
  }

  const weights = phaseWeights(phase, objective);
  const power = computePower(lane, analysis.taskType);

  let complexityModifier = 0;
  if (analysis.complexity === "complex") {
    complexityModifier = average([lane.metrics.performance, lane.metrics.accuracy, power]) * 0.04;
  } else if (analysis.complexity === "simple") {
    complexityModifier = average([lane.metrics.speed, lane.metrics.cheapness, lane.metrics.efficiency]) * 0.04;
  }

  const providerBias = directProviderPriority(lane.providerId, providerMode);
  const score =
    lane.metrics.performance * weights.performance +
    power * weights.power +
    lane.metrics.speed * weights.speed +
    lane.metrics.accuracy * weights.accuracy +
    lane.metrics.efficiency * weights.efficiency +
    lane.metrics.cheapness * weights.cheapness +
    providerBias +
    complexityModifier;

  return {
    ...lane,
    power,
    score
  };
}

function sortRankings(rankings) {
  return rankings.sort((left, right) => right.score - left.score);
}

export function buildGoldenRulePlan(task, providerMode = "auto", objective = "golden", userKeys = {}) {
  const analysis = analyzeTask(task);
  const providerStatus = getProviderStatus(userKeys);
  const lanes = getLaneCatalog();

  const availableDirect = lanes.filter(
    (lane) => lane.providerId !== "openrouter" && providerStatus[lane.providerId]?.configured
  );
  const availableFallback = lanes.filter(
    (lane) => lane.providerId === "openrouter" && providerStatus.openrouter?.configured
  );

  const architectDirect = sortRankings(
    availableDirect
      .map((lane) => scoreLane(lane, analysis, "architect", objective, providerMode, providerStatus))
      .filter(Boolean)
  );
  const builderDirect = sortRankings(
    availableDirect
      .map((lane) => scoreLane(lane, analysis, "builder", objective, providerMode, providerStatus))
      .filter(Boolean)
  );
  const reviewerDirect = sortRankings(
    availableDirect
      .map((lane) => scoreLane(lane, analysis, "reviewer", objective, providerMode, providerStatus))
      .filter(Boolean)
  );

  const architectFallback = sortRankings(
    availableFallback
      .map((lane) => scoreLane(lane, analysis, "architect", objective, "openrouter-only", providerStatus))
      .filter(Boolean)
  );
  const builderFallback = sortRankings(
    availableFallback
      .map((lane) => scoreLane(lane, analysis, "builder", objective, "openrouter-only", providerStatus))
      .filter(Boolean)
  );
  const reviewerFallback = sortRankings(
    availableFallback
      .map((lane) => scoreLane(lane, analysis, "reviewer", objective, "openrouter-only", providerStatus))
      .filter(Boolean)
  );

  const useFallbackOnly =
    providerMode === "openrouter-only" || (!architectDirect.length && architectFallback.length);

  return {
    analysis,
    providerStatus,
    useFallbackOnly,
    architectRanking: useFallbackOnly ? architectFallback : architectDirect,
    builderRanking: useFallbackOnly ? builderFallback : builderDirect,
    reviewerRanking: useFallbackOnly ? reviewerFallback : reviewerDirect,
    fallbackArchitectRanking: architectFallback,
    fallbackBuilderRanking: builderFallback,
    fallbackReviewerRanking: reviewerFallback
  };
}
