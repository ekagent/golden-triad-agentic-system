"use client";

import { useState, useEffect } from "react";

function ComplexityDot({ level }) {
  const colors = { low: "var(--accent)", medium: "var(--warn)", high: "var(--danger)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      fontSize: "0.78rem", color: "var(--ink-soft)"
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[level] || "var(--ink-soft)", display: "inline-block" }} />
      {level || "—"}
    </span>
  );
}

export default function AdminRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRuns = () => {
    setLoading(true);
    fetch("/api/admin?view=runs&limit=50")
      .then(r => {
        if (r.status === 403) throw new Error("Access denied");
        return r.json();
      })
      .then(d => setRuns(d.runs || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(); }, []);

  if (error) return <div className="error-box">{error}</div>;

  return (
    <div>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">▸ Execution Log</div>
          <h1 style={{ margin: "12px 0 0", fontSize: "1.4rem" }}>Recent Runs</h1>
          <p className="muted" style={{ marginTop: "4px" }}>Last {runs.length} agentic executions</p>
        </div>
        <button onClick={fetchRuns} disabled={loading} className="primary-action" style={{ padding: "10px 18px", fontSize: "0.85rem" }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </header>

      <div className="surface" style={{ borderRadius: "22px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Timestamp", "Task", "Mode", "Complexity"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "14px 18px",
                  fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="4" style={{ padding: "28px", textAlign: "center", color: "var(--ink-soft)" }}>Loading runs…</td></tr>
            )}
            {!loading && runs.length === 0 && (
              <tr><td colSpan="4" style={{ padding: "28px", textAlign: "center", color: "var(--ink-soft)" }}>No runs recorded yet.</td></tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(22,22,18,0.05)", transition: "background 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(15,111,79,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 18px", fontSize: "0.78rem", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace", whiteSpace: "nowrap" }}>
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "12px 18px", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.task || "—"}
                </td>
                <td style={{ padding: "12px 18px" }}>
                  <span className="provider-pill" style={{ fontSize: "0.72rem" }}>{r.providerMode || "auto"}</span>
                </td>
                <td style={{ padding: "12px 18px" }}>
                  <ComplexityDot level={r.complexity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
