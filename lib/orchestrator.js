import { GOLDEN_RULE_TEXT, getLaneCatalog } from "./catalog.js";
import { buildGoldenRulePlan } from "./golden-rule.js";
import { generateFromLane } from "./provider-client.js";
import { TOOL_SCHEMAS, executeToolCall } from "./tools.js";
import { acquireLock, releaseLock, logChange, updateState, logDecision, cleanupExpiredLocks } from "./coordination.js";
import { getUserSettings } from "./storage.js";

const AGENT_ID = "golden-triad:orchestrator";

const DEFAULT_RUN_BUDGET_MS = 180000;
const MAX_RUN_BUDGET_MS = 240000;
const MIN_PHASE_BUDGET_MS = 30000;
const FALLBACK_RESERVE_MS = 10000;
const PHASE_ORDER = ["architect", "builder", "reviewer"];
const PHASE_WEIGHTS = {
  architect: 1,
  builder: 1.5,
  reviewer: 1
};

function buildMessages(systemPrompt, userPrompt) {
  return [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
}

function architectPrompt(task, plan, objective) {
  return buildMessages(
    "You are the Architect agent inside a cost-aware agentic system. Produce a short execution plan with concrete steps, assumptions, and deployment implications. Keep it concise.",
    `Objective: ${objective}\nGolden Rule: ${GOLDEN_RULE_TEXT}\nTask:\n${task}\n\nComplexity: ${plan.analysis.complexity}\nTask type: ${plan.analysis.taskType}`
  );
}

function builderPrompt(task, architectOutput, plan, objective) {
  return buildMessages(
    "You are the Builder agent. Deliver the working answer directly. Be practical, implementation-oriented, and concise. Do not narrate your chain of thought.",
    `Objective: ${objective}\nGolden Rule: ${GOLDEN_RULE_TEXT}\nTask:\n${task}\n\nArchitect plan:\n${architectOutput}\n\nComplexity: ${plan.analysis.complexity}\nTask type: ${plan.analysis.taskType}`
  );
}

function reviewerPrompt(task, architectOutput, builderOutput, plan) {
  return buildMessages(
    "You are the Reviewer agent. Pressure-test the draft and produce a stronger final answer. Respond in three sections exactly: FINAL_ANSWER, KEY_FIXES, OPEN_RISKS.",
    `Task:\n${task}\n\nArchitect plan:\n${architectOutput}\n\nBuilder draft:\n${builderOutput}\n\nComplexity: ${plan.analysis.complexity}\nTask type: ${plan.analysis.taskType}`
  );
}

function parseReviewerOutput(text, builderOutput) {
  const finalMatch = text.match(/FINAL_ANSWER\b[\s:]*([\s\S]*?)(?=KEY_FIXES\b|OPEN_RISKS\b|$)/i);
  const fixesMatch = text.match(/KEY_FIXES\b[\s:]*([\s\S]*?)(?=OPEN_RISKS\b|$)/i);
  const risksMatch = text.match(/OPEN_RISKS\b[\s:]*([\s\S]*)$/i);

  return {
    finalAnswer: (finalMatch?.[1] || builderOutput).trim(),
    fixes: (fixesMatch?.[1] || "").trim(),
    risks: (risksMatch?.[1] || "").trim()
  };
}

function getRunBudgetMs() {
  const value = Number(process.env.AGENT_RUN_BUDGET_MS || DEFAULT_RUN_BUDGET_MS);

  if (!Number.isFinite(value) || value < 10000) {
    return DEFAULT_RUN_BUDGET_MS;
  }

  return Math.min(Math.floor(value), MAX_RUN_BUDGET_MS);
}

function createRunBudget() {
  const startedAt = Date.now();
  const totalMs = getRunBudgetMs();

  return {
    startedAt,
    totalMs,
    deadlineMs: startedAt + totalMs,
    remainingMs() {
      return this.deadlineMs - Date.now();
    }
  };
}

function getPhaseBudgetMs(runBudget, phaseName) {
  const phaseIndex = PHASE_ORDER.indexOf(phaseName);
  const remainingMs = runBudget.remainingMs();

  if (remainingMs < MIN_PHASE_BUDGET_MS) {
    throw new Error(`Run exceeded the execution budget before the ${phaseName} phase.`);
  }

  const remainingPhases = PHASE_ORDER.slice(phaseIndex);
  const remainingWeight = remainingPhases.reduce((sum, name) => sum + PHASE_WEIGHTS[name], 0);
  const phaseBudgetMs = Math.floor((remainingMs * PHASE_WEIGHTS[phaseName]) / remainingWeight);

  return Math.max(MIN_PHASE_BUDGET_MS, Math.min(remainingMs, phaseBudgetMs));
}

async function executePhase(name, ranking, fallbackRanking, messages, runBudget, options = {}) {
  if (!ranking.length && !fallbackRanking.length) {
    throw new Error(`No available lanes for ${name}. Add provider keys or choose OpenRouter only.`);
  }

  updateState(messages[1]?.content?.slice(0, 100) || name, `${AGENT_ID}:${name}`, "in_progress", name);
  cleanupExpiredLocks();

  const phaseBudgetMs = getPhaseBudgetMs(runBudget, name);
  const phaseDeadlineMs = Date.now() + phaseBudgetMs;
  const fallbackReserveMs = fallbackRanking.length
    ? Math.min(FALLBACK_RESERVE_MS, Math.max(0, phaseBudgetMs - MIN_PHASE_BUDGET_MS))
    : 0;
  
  const MAX_TOOL_LOOPS = 5;

  const runLaneIterations = async (lane, maxDeadlineMs) => {
    let currentMessages = [...messages];
    let totalLatencyMs = 0;
    let allAttempts = [];
    
    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const result = await generateFromLane(lane, currentMessages, {
        deadlineMs: maxDeadlineMs,
        ...(options.tools && { tools: options.tools })
      });
      
      totalLatencyMs += result.latencyMs;
      allAttempts.push(...result.attempts);
      
      if (result.tool_calls && result.tool_calls.length > 0) {
        currentMessages.push({
          role: "assistant",
          content: result.output || "",
          tool_calls: result.tool_calls
        });
        
        for (const tc of result.tool_calls) {
          const toolResult = await executeToolCall(tc);
          currentMessages.push({
            role: "tool",
            tool_call_id: tc.id || tc.function.name,
            name: tc.function.name,
            content: String(toolResult)
          });
        }
      } else {
        return {
          model: result.model,
          output: result.output,
          attempts: allAttempts,
          latencyMs: totalLatencyMs
        };
      }
    }
    throw new Error(`Max tool loops (${MAX_TOOL_LOOPS}) exceeded for phase ${name}`);
  };

  const formatLaneFailures = (failures) =>
    failures
      .map((failure) => `${failure.laneLabel}: ${failure.error}`)
      .join(" | ");

  const runLaneRanking = async (lanes, deadlineMs) => {
    const failures = [];

    for (const lane of lanes) {
      try {
        const result = await runLaneIterations(lane, deadlineMs);
        return { lane, result, failures };
      } catch (error) {
        failures.push({
          laneId: lane.id,
          laneLabel: lane.label,
          providerId: lane.providerId,
          providerLabel: lane.providerLabel,
          error: error instanceof Error ? error.message : "Unknown lane error"
        });

        if (Date.now() >= deadlineMs - MIN_PHASE_BUDGET_MS) {
          break;
        }
      }
    }

    return { lane: null, result: null, failures };
  };

  if (ranking.length) {
    const primary = await runLaneRanking(ranking, phaseDeadlineMs - fallbackReserveMs);

    if (primary.lane && primary.result) {
      return {
        name,
        providerId: primary.lane.providerId,
        providerLabel: primary.lane.providerLabel,
        laneId: primary.lane.id,
        laneLabel: primary.lane.label,
        ...primary.result
      };
    }

    if (!fallbackRanking.length) {
      throw new Error(
        `All direct lanes failed for ${name}. ${formatLaneFailures(primary.failures)}`
      );
    }

    const fallback = await runLaneRanking(fallbackRanking, phaseDeadlineMs);
    if (fallback.lane && fallback.result) {
      return {
        name,
        providerId: fallback.lane.providerId,
        providerLabel: fallback.lane.providerLabel,
        laneId: fallback.lane.id,
        laneLabel: fallback.lane.label,
        ...fallback.result,
        fallbackFrom: {
          attemptedDirectLanes: primary.failures
        }
      };
    }

    throw new Error(
      `All lanes failed for ${name}. Direct lanes: ${formatLaneFailures(primary.failures)}. Fallback lanes: ${formatLaneFailures(fallback.failures)}`
    );
  }

  const fallback = await runLaneRanking(fallbackRanking, phaseDeadlineMs);
  if (!fallback.lane || !fallback.result) {
    throw new Error(`All fallback lanes failed for ${name}. ${formatLaneFailures(fallback.failures)}`);
  }

  return {
    name,
    providerId: fallback.lane.providerId,
    providerLabel: fallback.lane.providerLabel,
    laneId: fallback.lane.id,
    laneLabel: fallback.lane.label,
    ...fallback.result
  };
}

function injectUserOverride(phaseName, ranking, roleModels, userKeys) {
  const modelOverride = roleModels[phaseName];
  if (!modelOverride) return ranking;
  const allLanes = getLaneCatalog();
  const matchingLane = allLanes.find(l => l.providerModelCandidates.includes(modelOverride));
  if (matchingLane) {
    const overriddenLane = { ...matchingLane, defaultModel: modelOverride, providerModelCandidates: [modelOverride, ...matchingLane.providerModelCandidates] };
    return [overriddenLane, ...ranking.filter(l => l.id !== overriddenLane.id)];
  }
  return ranking;
}

export async function runAgenticTask({ task, providerMode = "auto", objective = "golden", userId = null }) {
  const settings = userId ? await getUserSettings(userId) : { api_keys: {}, role_models: {} };
  const userKeys = settings.api_keys || {};
  const roleModels = settings.role_models || {};

  const plan = buildGoldenRulePlan(task, providerMode, objective, userKeys);
  const runBudget = createRunBudget();

  if (
    !plan.architectRanking.length &&
    !plan.fallbackArchitectRanking.length &&
    !plan.providerStatus.openrouter.configured
  ) {
    throw new Error(
      "No providers are configured. Add GLM_API_KEY, MIMO_API_KEY, or OPENROUTER_API_KEY."
    );
  }

  const archRanking = injectUserOverride('architect', plan.architectRanking, roleModels, userKeys);
  const architect = await executePhase(
    "architect",
    archRanking,
    plan.fallbackArchitectRanking,
    architectPrompt(task, plan, objective),
    runBudget,
    { userKeys }
  );

  const bldRanking = injectUserOverride('builder', plan.builderRanking, roleModels, userKeys);
  const builder = await executePhase(
    "builder",
    bldRanking,
    plan.fallbackBuilderRanking,
    builderPrompt(task, architect.output, plan, objective),
    runBudget,
    { tools: TOOL_SCHEMAS, userKeys }
  );

  const revRanking = injectUserOverride('reviewer', plan.reviewerRanking, roleModels, userKeys);
  const reviewer = await executePhase(
    "reviewer",
    revRanking,
    plan.fallbackReviewerRanking,
    reviewerPrompt(task, architect.output, builder.output, plan),
    runBudget,
    { tools: TOOL_SCHEMAS, userKeys }
  );

  const reviewed = parseReviewerOutput(reviewer.output, builder.output);

  const finalAnswer = [
    reviewed.finalAnswer,
    reviewed.fixes ? `\nKey fixes\n${reviewed.fixes}` : "",
    reviewed.risks ? `\nOpen risks\n${reviewed.risks}` : ""
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const result = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    task,
    providerMode,
    objective,
    analysis: plan.analysis,
    finalAnswer,
    goldenRule: {
      text: GOLDEN_RULE_TEXT,
      builderRanking: plan.builderRanking.slice(0, 5).map((entry) => ({
        id: entry.id,
        label: entry.label,
        providerLabel: entry.providerLabel,
        defaultModel: entry.defaultModel,
        score: entry.score
      }))
    },
    phases: [architect, builder, reviewer],
    usersSettingsEmployed: userKeys && Object.keys(userKeys).length > 0
  };

  const phases = [architect, builder, reviewer];
  
  // Coordination: Log completion and update state
  updateState(task, AGENT_ID, "completed", "done");
  logChange(AGENT_ID, ["run completed"], `Task: ${task}\nPhases: ${phases.map(p => p.name).join(", ")}\nLatency: ${phases.reduce((sum, p) => sum + p.latencyMs, 0)}ms`);
  logDecision(AGENT_ID, `Selected ${phases.map(p => `${p.providerId}:${p.model}`).join(" → ")}`, `Task: ${task}, Mode: ${providerMode}`, phases.map(p => p.providerLabel).join(", "), `Final answer generated in ${phases.reduce((sum, p) => sum + p.latencyMs, 0)}ms`);

  return result;
}
