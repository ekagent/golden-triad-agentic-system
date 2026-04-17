"use client";

import { useState, useEffect } from "react";

function StatusBadge({ status }) {
  const isConnected = status?.ok;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "3px 10px",
      borderRadius: "100px",
      fontSize: "0.78rem",
      fontWeight: 600,
      background: isConnected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.10)",
      color: isConnected ? "#16a34a" : "#dc2626",
      border: `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)"}`
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: isConnected ? "#16a34a" : "#dc2626", display: "inline-block" }} />
      {isConnected ? "Connected" : "Not configured"}
    </span>
  );
}

function IntegrationCard({ icon, name, description, docsUrl, status, detail }) {
  return (
    <div className="surface" style={{
      borderRadius: "12px",
      padding: "1.5rem",
      border: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.75rem" }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{name}</div>
            <div className="muted" style={{ fontSize: "0.82rem" }}>{description}</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {status?.ok && detail && (
        <div className="muted" style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "6px 10px" }}>
          {detail}
        </div>
      )}

      {!status?.ok && (
        <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
          Configure via <code style={{ fontSize: "0.78rem", background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: "4px" }}>.env.local</code> —{" "}
          <a href={docsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none" }}>view setup guide ↗</a>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      setStatus(data);
      setRefreshed(new Date().toLocaleTimeString());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Omnichannel Integrations</h1>
          <p className="muted">Connect external tools the agent can autonomously operate during execution.</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="history-button"
          style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}
        >
          {loading ? "Checking…" : "↻ Refresh"}
        </button>
      </header>

      {refreshed && (
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>
          Last checked: {refreshed}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <IntegrationCard
          icon="🐙"
          name="GitHub"
          description="Create issues, list repos, post comments autonomously during agentic runs."
          docsUrl="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
          status={status?.github}
          detail={status?.github?.login ? `Authenticated as @${status.github.login}` : null}
        />
        <IntegrationCard
          icon="🔷"
          name="Jira"
          description="Create tickets, update statuses, and add comments directly from agent pipelines."
          docsUrl="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
          status={status?.jira}
          detail={status?.jira?.displayName ? `Authenticated as ${status.jira.displayName} (${status.jira.email})` : null}
        />
      </div>

      <div className="surface" style={{ marginTop: "2rem", borderRadius: "10px", padding: "1.25rem", border: "1px solid var(--color-border)" }}>
        <h3 style={{ margin: "0 0 0.75rem" }}>Required Environment Variables</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--color-muted)" }}>Variable</th>
              <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--color-muted)" }}>Integration</th>
              <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--color-muted)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["GITHUB_PERSONAL_TOKEN", "GitHub", "Personal access token with repo + issues scope"],
              ["JIRA_HOST", "Jira", "Your Atlassian domain (e.g. yourco.atlassian.net)"],
              ["JIRA_EMAIL", "Jira", "Your Atlassian account email"],
              ["JIRA_API_TOKEN", "Jira", "API token from Atlassian account settings"],
              ["JIRA_DEFAULT_PROJECT", "Jira", "Default project key used if not specified in tool call"],
            ].map(([key, integration, desc]) => (
              <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "8px 10px" }}>
                  <code style={{ fontSize: "0.78rem", background: "rgba(255,255,255,0.07)", padding: "2px 6px", borderRadius: "4px" }}>{key}</code>
                </td>
                <td style={{ padding: "8px 10px", color: "var(--color-muted)" }}>{integration}</td>
                <td style={{ padding: "8px 10px", color: "var(--color-muted)" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
