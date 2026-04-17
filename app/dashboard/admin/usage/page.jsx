"use client";

import { useState, useEffect } from "react";

// ─── Bar Chart (pure SVG) ────────────────────────────────────────────────────

function BarChart({ data, width = 600, height = 160, barKey = "credits", labelKey = "day" }) {
  if (!data || data.length === 0) {
    return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", fontSize: "0.78rem" }}>No usage data yet</div>;
  }

  const max = Math.max(...data.map(d => d[barKey]), 1);
  const barWidth = Math.max(4, (width - 40) / data.length - 3);

  return (
    <svg width={width} height={height + 28} viewBox={`0 0 ${width} ${height + 28}`} style={{ display: "block" }}>
      {/* Y-axis labels */}
      <text x="0" y="12" fontSize="9" fill="var(--ink-soft)" fontFamily="var(--font-mono), monospace">{max}</text>
      <text x="0" y={height - 2} fontSize="9" fill="var(--ink-soft)" fontFamily="var(--font-mono), monospace">0</text>

      {/* Grid lines */}
      <line x1="30" y1="0" x2={width} y2="0" stroke="var(--line)" strokeWidth="0.5" />
      <line x1="30" y1={height / 2} x2={width} y2={height / 2} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="4,4" />
      <line x1="30" y1={height} x2={width} y2={height} stroke="var(--line)" strokeWidth="0.5" />

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = (d[barKey] / max) * (height - 8);
        const x = 34 + i * ((width - 40) / data.length);
        const y = height - barHeight;
        const label = typeof d[labelKey] === "string" ? d[labelKey].slice(5, 10) : "";

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barWidth} height={barHeight}
              rx="2"
              fill="var(--accent)"
              opacity={0.75}
            >
              <title>{`${label}: ${d[barKey]} ${barKey}`}</title>
            </rect>
            {data.length <= 15 && (
              <text x={x + barWidth / 2} y={height + 16} fontSize="8" fill="var(--ink-soft)" textAnchor="middle" fontFamily="var(--font-mono), monospace">
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart (pure SVG) ──────────────────────────────────────────────────

function DonutChart({ data, size = 120 }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.credits, 0);
  if (total === 0) return null;

  const colors = ["var(--accent)", "var(--warn)", "var(--danger)", "#6b3fb6", "#2563eb", "#059669"];
  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -90;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const pct = d.credits / total;
          const angle = pct * 360;
          const endAngle = startAngle + angle;

          const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);
          const large = angle > 180 ? 1 : 0;

          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
          startAngle = endAngle;

          return <path key={i} d={path} fill={colors[i % colors.length]} opacity={0.8} />;
        })}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="var(--panel)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], display: "inline-block" }} />
            <span style={{ color: "var(--ink-soft)" }}>{d.type}</span>
            <span style={{ fontWeight: 600, marginLeft: "auto" }}>{d.credits}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminUsagePage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const fetchUsage = (d) => {
    setLoading(true);
    fetch(`/api/admin?view=usage&days=${d}`)
      .then(r => {
        if (r.status === 403) throw new Error("Access denied");
        return r.json();
      })
      .then(setUsage)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsage(days); }, [days]);

  if (error) return <div className="error-box">{error}</div>;

  return (
    <div>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">◆ Usage Analytics</div>
          <h1 style={{ margin: "12px 0 0", fontSize: "1.4rem" }}>Credit Consumption</h1>
          <p className="muted" style={{ marginTop: "4px" }}>Track how credits are being used across the platform.</p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "6px 14px", borderRadius: "999px", border: "1px solid var(--line)",
                background: days === d ? "var(--accent)" : "transparent",
                color: days === d ? "#fff" : "var(--ink)",
                cursor: "pointer", fontSize: "0.78rem", fontWeight: days === d ? 600 : 400,
                transition: "all 150ms"
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="muted" style={{ textAlign: "center", padding: "40px" }}>Loading usage data…</p>}

      {!loading && usage && (
        <>
          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Total Events", value: usage.totalEvents },
              { label: "Credits Used", value: usage.totalCredits, accent: true },
              { label: "Active Users", value: usage.uniqueUsers },
            ].map(kpi => (
              <div key={kpi.label} className="surface" style={{ padding: "18px 20px", borderRadius: "18px", animation: "fade-up 420ms ease both" }}>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>{kpi.label}</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px", color: kpi.accent ? "var(--accent)" : "var(--ink)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "16px", marginBottom: "24px" }}>
            {/* Daily Credits */}
            <div className="surface" style={{ padding: "20px 22px", borderRadius: "20px" }}>
              <span className="section-title">Daily Credit Usage</span>
              <div style={{ marginTop: "14px", overflowX: "auto" }}>
                <BarChart data={usage.daily} barKey="credits" labelKey="day" width={Math.max(400, usage.daily.length * 22)} height={140} />
              </div>
            </div>

            {/* By Type */}
            <div className="surface" style={{ padding: "20px 22px", borderRadius: "20px" }}>
              <span className="section-title">By Event Type</span>
              <div style={{ marginTop: "14px" }}>
                <DonutChart data={usage.byType} size={110} />
              </div>
            </div>
          </div>

          {/* Top Users Table */}
          <div className="surface" style={{ padding: "20px 22px", borderRadius: "20px" }}>
            <span className="section-title">Top Users by Credit Consumption</span>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginTop: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th style={{ textAlign: "left", padding: "10px 0", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>User</th>
                  <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Events</th>
                  <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Credits</th>
                  <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.topUsers.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "var(--ink-soft)" }}>No usage recorded yet.</td></tr>
                )}
                {usage.topUsers.map((u, i) => (
                  <tr key={u.userId} style={{ borderBottom: "1px solid rgba(22,22,18,0.05)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(15,111,79,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 0", fontFamily: "var(--font-mono), monospace", fontSize: "0.78rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)" }}>{i + 1}</span>
                        {u.userId.slice(0, 18)}…
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>{u.events}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{u.credits}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", color: "var(--ink-soft)" }}>
                      {usage.totalCredits > 0 ? `${((u.credits / usage.totalCredits) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
