"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

const DEMO_TASK =
  "Design a deployable plan for a productized AI coding assistant with a clean UI, a fast pricing model, and a launch-ready implementation checklist.";

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

function providerLabel(mode) {
  switch (mode) {
    case "glm-first":
      return "GLM first";
    case "memo-first":
      return "Memo first";
    case "openrouter-only":
      return "OpenRouter only";
    default:
      return "Auto";
  }
}

export default function StudioShell({
  initialHistory,
  initialHealth,
  initialHistoryError,
  catalog,
  goldenRule
}) {
  const [task, setTask] = useState(DEMO_TASK);
  const [objective, setObjective] = useState("golden");
  const [providerMode, setProviderMode] = useState("auto");
  const [bypassCache, setBypassCache] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [activeRun, setActiveRun] = useState(initialHistory[0] || null);
  const [health, setHealth] = useState(initialHealth);
  const [error, setError] = useState(initialHistoryError || "");
  const [isPending, startTransition] = useTransition();
  const providerStatus = health.providers;

  const configuredCount = useMemo(
    () => Object.values(providerStatus).filter((provider) => provider.configured).length,
    [providerStatus]
  );

  useEffect(() => {
    let isActive = true;

    async function refreshHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store"
        });

        const payload = await response.json().catch(() => null);

        if (isActive && payload) {
          setHealth(payload);
        }
      } catch {
        // leave the last known status in place
      }
    }

    refreshHealth();
    const intervalId = window.setInterval(refreshHealth, 60000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  function runtimeTone(status) {
    return status === "ready" ? "live" : status === "degraded" ? "warn" : "";
  }

  function selectRun(run) {
    setActiveRun(run);
  }

  function onSubmit(event) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            task,
            providerMode,
            objective,
            bypassCache
          })
        });

        const payload = await response.json();

        if (payload.run) {
          setActiveRun(payload.run);
        }

        if (!response.ok) {
          throw new Error(payload.error || "Request failed.");
        }

        setHistory((current) => [payload.run, ...current.filter((item) => item.id !== payload.run.id)].slice(0, 20));
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Request failed.");
      }
    });
  }

  return (
    <main className="studio">
      <section className="studio-shell">
        <aside className="rail surface">
          <div className="rail-content stack">
            <div className="brand-block">
              <span className="eyebrow">Golden Triad</span>
              <h1 className="brand-title">Agentic system with direct lanes and a controlled fallback.</h1>
              <p className="brand-copy">
                Built around GLM and Memo first, then OpenRouter only when it improves reliability or rescues a failed run.
              </p>
            </div>

            <div className="stack">
              <h2 className="section-title">Provider status</h2>
              <div className="status-list">
                {Object.values(providerStatus).map((provider) => (
                  <div className="status-item" key={provider.id}>
                    <div className="status-row">
                      <span>{provider.label}</span>
                      <span className="provider-pill">
                        <span className={`provider-dot ${provider.configured ? "live" : ""}`} />
                        {provider.configured ? "ready" : "missing"}
                      </span>
                    </div>
                    <p className="mini">{provider.mode}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <h2 className="section-title">Runtime status</h2>
              <div className="status-list">
                {[health.persistence, health.cache].map((service) => (
                  <div className="status-item" key={service.id}>
                    <div className="status-row">
                      <span>{service.label}</span>
                      <span className="provider-pill">
                        <span className={`provider-dot ${runtimeTone(service.status)}`} />
                        {service.status}
                      </span>
                    </div>
                    <p className="mini">
                      {service.mode} · {service.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <h2 className="section-title">Run history</h2>
              <div className="history-list">
                {history.length ? (
                  history.map((run) => (
                    <div className="history-item" key={run.id}>
                      <button className="history-button" type="button" onClick={() => selectRun(run)}>
                        <div className="history-copy">
                          <div className="history-head">
                            <strong>{run.analysis?.taskType || "general"}</strong>
                            <span className="mini">{run.analysis?.complexity || "auto"}</span>
                          </div>
                          <p className="muted">{run.task.slice(0, 110)}</p>
                          <p className="mini">{formatDate(run.createdAt)}</p>
                        </div>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p className="muted">No runs yet. Submit a build task to generate the first orchestration trace.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="workspace surface">
          <div className="workspace-content">
            <form className="composer" onSubmit={onSubmit}>
              <div className="row-between">
                <div>
                  <h2 className="section-title">Mission</h2>
                  <p className="brand-copy">Give the system a build task. It will architect, build, and review before returning the final answer.</p>
                </div>
                <span className="mode-pill">{providerLabel(providerMode)}</span>
              </div>

              <div className="field">
                <label className="label" htmlFor="task">
                  Task
                </label>
                <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} />
              </div>

              <div className="composer-grid">
                <div className="field">
                  <label className="label" htmlFor="objective">
                    Objective
                  </label>
                  <select id="objective" value={objective} onChange={(event) => setObjective(event.target.value)}>
                    <option value="golden">Golden Rule</option>
                    <option value="speed">Speed</option>
                    <option value="power">Power</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="providerMode">
                    Routing
                  </label>
                  <select id="providerMode" value={providerMode} onChange={(event) => setProviderMode(event.target.value)}>
                    <option value="auto">Auto</option>
                    <option value="glm-first">GLM first</option>
                    <option value="memo-first">Memo first</option>
                    <option value="openrouter-only">OpenRouter only</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Execution</label>
                  <div className="answer-shell">
                    <strong>{configuredCount} / 3 providers ready</strong>
                    <label className="toggle-row" htmlFor="bypassCache">
                      <input
                        id="bypassCache"
                        type="checkbox"
                        checked={bypassCache}
                        onChange={(event) => setBypassCache(event.target.checked)}
                      />
                      <span>Bypass Redis cache</span>
                    </label>
                    <p className="secondary-note">
                      OpenRouter alone is enough to run the first live slice. Repeated tasks use Redis when ready.
                    </p>
                  </div>
                </div>
              </div>

              <button className="primary-action" type="submit" disabled={isPending}>
                {isPending ? "Running agent pipeline..." : "Run the system"}
              </button>
            </form>

            {error ? <div className="error-box">{error}</div> : null}

            <div className="result-block">
              <div className="row-between">
                <h2 className="section-title">Final answer</h2>
                <div className="row-inline">
                  {activeRun?.runtime?.responseSource ? (
                    <span className="provider-pill">
                      {activeRun.runtime.responseSource === "cache" ? "cache hit" : "live run"}
                    </span>
                  ) : null}
                  {activeRun ? <span className="score-pill">{activeRun.objective}</span> : null}
                </div>
              </div>

              {activeRun ? (
                <>
                  <div className="answer-shell">
                    <div className="row-between">
                      <strong>{activeRun.analysis?.taskType || "general"} workflow</strong>
                      <span className="mini">
                        {activeRun.analysis?.complexity || "auto"} · {activeRun.providerMode}
                      </span>
                    </div>
                    {activeRun.runtime?.cache ? (
                      <p className="mini">
                        Cache {activeRun.runtime.cache.status}
                        {activeRun.runtime.cache.ttlSeconds
                          ? ` · TTL ${activeRun.runtime.cache.ttlSeconds}s`
                          : ""}
                        {activeRun.runtime.cache.bypassed ? " · bypassed" : ""}
                      </p>
                    ) : null}
                    <div className="answer">{activeRun.finalAnswer}</div>
                  </div>

                  <div className="stack">
                    <h2 className="section-title">Agent phases</h2>
                    <div className="phase-list">
                      {activeRun.phases.map((phase) => (
                        <div className="phase-item" key={`${activeRun.id}-${phase.name}`}>
                          <div className="phase-head">
                            <strong>{phase.name}</strong>
                            <span className="phase-model">
                              {phase.providerLabel} · {phase.model}
                            </span>
                          </div>
                          <p className="mini">
                            {phase.laneLabel}
                            {phase.fallbackFrom ? ` · fallback from ${phase.fallbackFrom.providerLabel}` : ""}
                            {phase.latencyMs ? ` · ${phase.latencyMs}ms` : ""}
                          </p>
                          <div className="phase-body">{phase.output}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p className="muted">The first successful run will appear here with the phase-by-phase trace.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="inspector surface">
          <div className="inspector-content stack">
            <div className="inspector-rule">
              <strong>Golden Rule</strong>
              <p className="brand-copy">{goldenRule}</p>
            </div>

            <div className="metric-grid">
              <div className="metric-copy">
                <span className="label">Fallback role</span>
                <span className="metric-value">OpenRouter</span>
                <span className="muted">Only used when direct lanes are missing or fail.</span>
              </div>
              <div className="metric-copy">
                <span className="label">Primary lanes</span>
                <span className="metric-value">GLM + Memo</span>
                <span className="muted">Direct providers get the first scoring pass.</span>
              </div>
            </div>

            <div className="stack">
              <h2 className="section-title">Catalog</h2>
              <div className="note-list">
                {catalog.map((lane) => (
                  <div className="note-item" key={lane.id}>
                    <div className="row-between">
                      <strong>{lane.label}</strong>
                      <span className="provider-pill">{lane.providerLabel}</span>
                    </div>
                    <p className="muted">{lane.description}</p>
                    <p className="mini">{lane.defaultModel}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <h2 className="section-title">Golden Rule ranking</h2>
              {activeRun?.goldenRule?.builderRanking?.length ? (
                <div className="ranking-list">
                  {activeRun.goldenRule.builderRanking.map((entry) => (
                    <div className="ranking-item" key={entry.id}>
                      <div className="ranking-head">
                        <strong>{entry.label}</strong>
                        <span className="score-pill">{Math.round(entry.score)}</span>
                      </div>
                      <p className="mini">
                        {entry.providerLabel} · {entry.defaultModel}
                      </p>
                      <div className="ranking-meter">
                        <span style={{ width: `${Math.min(100, entry.score)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="muted">Run a task to see the live model ranking and selection trace.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
