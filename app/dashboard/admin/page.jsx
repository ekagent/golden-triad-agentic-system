"use client";

import { useState, useEffect } from "react";

function Sparkline({ data, width = 280, height = 60 }) {
  if (!data || data.length === 0) {
    return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", fontSize: "0.78rem" }}>No data yet</div>;
  }
  const max = Math.max(...data.map(d => d.runs), 1);
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (d.runs / max) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkFill)" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="surface" style={{
      padding: "20px 22px",
      borderRadius: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      animation: "fade-up 420ms ease both"
    }}>
      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>{label}</span>
      <span style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1, color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</span>
      {sub && <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>{sub}</span>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin?view=overview")
      .then(r => {
        if (r.status === 403) throw new Error("Access denied. Your user ID is not in ADMIN_USER_IDS.");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-soft)" }}>
        Loading admin data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box" style={{ maxWidth: "500px" }}>
        <strong>Admin Access Error</strong>
        <p style={{ margin: "8px 0 0", fontSize: "0.88rem" }}>{error}</p>
        <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--ink-soft)" }}>
          Add your Clerk user ID to <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px" }}>ADMIN_USER_IDS</code> in <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px" }}>.env.local</code>
        </p>
      </div>
    );
  }

  const revenueEstimate = ((stats?.creditsOutstanding || 0) * 0.10).toFixed(2);

  return (
    <div>
      <header style={{ marginBottom: "28px" }}>
        <div className="eyebrow">◈ Platform Overview</div>
        <h1 style={{ margin: "12px 0 0", fontSize: "1.6rem" }}>Admin Dashboard</h1>
        <p className="muted" style={{ marginTop: "6px" }}>Real-time platform metrics from your Postgres ledger.</p>
      </header>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "28px" }}>
        <KpiCard label="Total Runs" value={stats.totalRuns} sub={`${stats.runs24h} in last 24h`} />
        <KpiCard label="7-Day Runs" value={stats.runs7d} />
        <KpiCard label="Total Users" value={stats.totalUsers} sub={`${stats.paidUsers} paid`} />
        <KpiCard label="Credits Held" value={stats.totalCreditsHeld} sub={`≈ $${revenueEstimate} value`} accent />
      </div>

      {/* Sparkline */}
      <div className="surface" style={{ padding: "22px 24px", borderRadius: "22px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <span className="section-title">Daily Run Volume</span>
            <span className="muted" style={{ display: "block", fontSize: "0.78rem", marginTop: "4px" }}>Last 14 days</span>
          </div>
        </div>
        <Sparkline data={stats.dailyRuns} width={600} height={80} />
      </div>

      {/* Quick Info */}
      <div className="surface" style={{ padding: "22px 24px", borderRadius: "22px" }}>
        <span className="section-title">System Configuration</span>
        <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
          {[
            ["Run Budget", `${process.env.NEXT_PUBLIC_RUN_BUDGET || "45000"}ms`],
            ["Cache TTL", `${process.env.NEXT_PUBLIC_CACHE_TTL || "900"}s`],
            ["Credit Value", "$0.10 / credit"],
            ["Target Margin", "80%"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>{k}</span>
              <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono), monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
