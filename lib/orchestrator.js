import { GOLDEN_RULE_TEXT } from "@/lib/catalog";
import { buildGoldenRulePlan } from "@/lib/golden-rule";
import { generateFromLane } from "@/lib/provider-client";

const DEFAULT_RUN_BUDGET_MS = 45000;
const MAX_RUN_BUDGET_MS = 50000;
const MIN_PHASE_BUDGET_MS = 1500;
const FALLBACK_RESERVE_MS = 3000;
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

async function executePhase(name, ranking, fallbackRanking, messages, runBudget) {
  if (!ranking.length && !fallbackRanking.length) {
    throw new Error(`No available lanes for ${name}. Add provider keys or choose OpenRouter only.`);
  }

  const phaseBudgetMs = getPhaseBudgetMs(runBudget, name);
  const phaseDeadlineMs = Date.now() + phaseBudgetMs;
  const fallbackReserveMs = fallbackRanking.length
    ? Math.min(FALLBACK_RESERVE_MS, Math.max(0, phaseBudgetMs - MIN_PHASE_BUDGET_MS))
    : 0;
  const directLane = ranking[0];

  if (directLane) {
    try {
      const result = await generateFromLane(directLane, messages, {
        deadlineMs: phaseDeadlineMs - fallbackReserveMs
      });
      return {
        name,
        providerId: directLane.providerId,
        providerLabel: directLane.providerLabel,
        laneId: directLane.id,
        laneLabel: directLane.label,
        model: result.model,
        output: result.output,
        attempts: result.attempts,
        latencyMs: result.latencyMs
      };
    } catch (error) {
      if (!fallbackRanking.length) {
        throw error;
      }

      const fallbackLane = fallbackRanking[0];
      const fallback = await generateFromLane(fallbackLane, messages, {
        deadlineMs: phaseDeadlineMs
      });

      return {
        name,
        providerId: fallbackLane.providerId,
        providerLabel: fallbackLane.providerLabel,
        laneId: fallbackLane.id,
        laneLabel: fallbackLane.label,
        model: fallback.model,
        output: fallback.output,
        attempts: fallback.attempts,
        latencyMs: fallback.latencyMs,
        fallbackFrom: {
          providerId: directLane.providerId,
          providerLabel: directLane.providerLabel,
          laneId: directLane.id,
          laneLabel: directLane.label
        }
      };
    }
  }

  const fallbackLane = fallbackRanking[0];
  const fallback = await generateFromLane(fallbackLane, messages, {
    deadlineMs: phaseDeadlineMs
  });

  return {
    name,
    providerId: fallbackLane.providerId,
    providerLabel: fallbackLane.providerLabel,
    laneId: fallbackLane.id,
    laneLabel: fallbackLane.label,
    model: fallback.model,
    output: fallback.output,
    attempts: fallback.attempts,
    latencyMs: fallback.latencyMs
  };
}

export async function runAgenticTask({ task, providerMode = "auto", objective = "golden" }) {
  const plan = buildGoldenRulePlan(task, providerMode, objective);
  const runBudget = createRunBudget();

  if (
    !plan.architectRanking.length &&
    !plan.fallbackArchitectRanking.length &&
    !plan.providerStatus.openrouter.configured
  ) {
    throw new Error(
      "No providers are configured. Add GLM_API_KEY, MEMO_API_KEY or MIMO_API_KEY, or OPENROUTER_API_KEY."
    );
  }

  const architect = await executePhase(
    "architect",
    plan.architectRanking,
    plan.fallbackArchitectRanking,
    architectPrompt(task, plan, objective),
    runBudget
  );

  const builder = await executePhase(
    "builder",
    plan.builderRanking,
    plan.fallbackBuilderRanking,
    builderPrompt(task, architect.output, plan, objective),
    runBudget
  );

  const reviewer = await executePhase(
    "reviewer",
    plan.reviewerRanking,
    plan.fallbackReviewerRanking,
    reviewerPrompt(task, architect.output, builder.output, plan),
    runBudget
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

  return {
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
    phases: [architect, builder, reviewer]
  };
}
