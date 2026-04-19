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
        {/* Simplified Header */}
        <header className="surface brand-block" style={{ padding: '24px', textAlign: 'center' }}>
          <span className="eyebrow" style={{ margin: '0 auto' }}>Golden Triad</span>
          <h1 className="brand-title">Agentic system with focus on work.</h1>
        </header>

        {/* Workspace: The Core Focus */}
        <section className="workspace surface">
          <div className="workspace-content">
            <form className="composer" onSubmit={onSubmit}>
              <div className="row-between">
                <div>
                  <h2 className="section-title">Mission</h2>
                  <p className="brand-copy">Define the task and let the system architect the solution.</p>
                </div>
                <span className="mode-pill">{providerLabel(providerMode)}</span>
              </div>

              <div className="field">
                <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} placeholder="What are we building?" />
              </div>

              <div className="composer-grid">
                <div className="field">
                  <label className="label" htmlFor="objective">Objective</label>
                  <select id="objective" value={objective} onChange={(event) => setObjective(event.target.value)}>
                    <option value="golden">Golden Rule</option>
                    <option value="speed">Speed</option>
                    <option value="power">Power</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="providerMode">Routing</label>
                  <select id="providerMode" value={providerMode} onChange={(event) => setProviderMode(event.target.value)}>
                    <option value="auto">Auto</option>
                    <option value="glm-first">GLM first</option>
                    <option value="memo-first">Memo first</option>
                    <option value="openrouter-only">OpenRouter only</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Cache</label>
                  <label className="toggle-row" htmlFor="bypassCache" style={{ marginTop: 0 }}>
                    <input
                      id="bypassCache"
                      type="checkbox"
                      checked={bypassCache}
                      onChange={(event) => setBypassCache(event.target.checked)}
                    />
                    <span>Bypass Local Redis</span>
                  </label>
                </div>
              </div>

              <button className="primary-action" type="submit" disabled={isPending} style={{ width: '100%', justifyContent: 'center' }}>
                {isPending ? "Running agent pipeline..." : "Run the system"}
              </button>
            </form>

            {error ? <div className="error-box">{error}</div> : null}

            {/* Final Answer */}
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
                <div className="answer-shell">
                  <div className="answer">{activeRun.finalAnswer}</div>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="muted">The first successful run will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Agent Phases Trace */}
        {activeRun && (
          <section className="surface" style={{ padding: '24px' }}>
            <h2 className="section-title" style={{ marginBottom: '20px' }}>Agent phases trace</h2>
            <div className="phase-list">
              {activeRun.phases.map((phase) => (
                <div className="phase-item" key={`${activeRun.id}-${phase.name}`}>
                  <div className="phase-head">
                    <strong>{phase.name}</strong>
                    <span className="phase-model">{phase.providerLabel} · {phase.model}</span>
                  </div>
                  <div className="phase-body">{phase.output}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History Area (Below Workspace) */}
        <section className="surface" style={{ padding: '24px' }}>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>Run history</h2>
          <div className="history-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {history.length ? (
              history.map((run) => (
                <button className="history-item surface" key={run.id} type="button" onClick={() => selectRun(run)} style={{ textAlign: 'left', padding: '16px', border: '1px solid var(--line)' }}>
                  <div className="history-head">
                    <strong>{run.analysis?.taskType || "general"}</strong>
                    <span className="mini">{formatDate(run.createdAt)}</span>
                  </div>
                  <p className="muted" style={{ fontSize: '12px', marginTop: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {run.task}
                  </p>
                </button>
              ))
            ) : (
              <p className="muted">No history found.</p>
            )}
          </div>
        </section>

        {/* System Manifest (Technical Bottom Section) */}
        <footer className="stack" style={{ marginTop: '40px', paddingBottom: '60px' }}>
          <div className="inspector-rule" style={{ textAlign: 'center' }}>
            <strong>Golden Rule</strong>
            <p className="brand-copy" style={{ margin: '0 auto', maxWidth: '600px' }}>{goldenRule}</p>
          </div>

          <div className="metric-grid">
            <div className="metric-copy surface">
              <span className="label">Status</span>
              <span className="metric-value">{configuredCount} / 3</span>
              <span className="muted">Providers calibrated and ready.</span>
            </div>
            <div className="metric-copy surface">
              <span className="label">Infrastructure</span>
              <span className="metric-value">{health.persistence.status}</span>
              <span className="muted">Ledger + Redis performance cache.</span>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
