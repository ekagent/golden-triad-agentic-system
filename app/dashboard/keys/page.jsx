"use client";

import { useState, useEffect } from "react";

function KeyRow({ apiKey, onRevoke }) {
  const isRevoked = apiKey.revoked;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderTop: "1px solid var(--line)",
      opacity: isRevoked ? 0.45 : 1
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{apiKey.label}</span>
          {isRevoked && (
            <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "999px", background: "rgba(159,45,28,0.08)", color: "var(--danger)", border: "1px solid rgba(159,45,28,0.15)" }}>
              REVOKED
            </span>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.78rem", color: "var(--ink-soft)" }}>
          {apiKey.keyPrefix}
        </span>
        <div style={{ display: "flex", gap: "14px", fontSize: "0.72rem", color: "var(--ink-soft)" }}>
          <span>Created {new Date(apiKey.createdAt).toLocaleDateString()}</span>
          {apiKey.lastUsedAt && <span>Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>}
        </div>
      </div>
      {!isRevoked && (
        <button
          onClick={() => onRevoke(apiKey.id)}
          style={{
            background: "none", border: "1px solid rgba(159,45,28,0.2)", borderRadius: "10px",
            padding: "6px 14px", cursor: "pointer", fontSize: "0.78rem", color: "var(--danger)",
            transition: "all 150ms"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(159,45,28,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
        >
          Revoke
        </button>
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = () => {
    setLoading(true);
    fetch("/api/keys")
      .then(r => r.json())
      .then(d => setKeys(d.keys || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel || "Default" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKey(data);
      setNewLabel("");
      fetchKeys();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Revoke failed");
      fetchKeys();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCopy = () => {
    if (newKey?.rawKey) {
      navigator.clipboard.writeText(newKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeKeys = keys.filter(k => !k.revoked);

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>API Keys</h1>
        <p className="muted" style={{ marginTop: "6px" }}>
          Generate keys for programmatic access to the Golden Triad agent via <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>POST /api/v1/run</code>
        </p>
      </header>

      {error && (
        <div className="error-box" style={{ marginBottom: "16px" }}>{error}</div>
      )}

      {/* New Key Alert */}
      {newKey && (
        <div className="surface" style={{
          padding: "20px", borderRadius: "18px", marginBottom: "20px",
          border: "2px solid var(--accent)", animation: "fade-up 300ms ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong style={{ color: "var(--accent)" }}>Key Created — Copy It Now</strong>
              <p className="muted" style={{ fontSize: "0.82rem", margin: "6px 0 0" }}>
                This is the only time your full key will be shown. Store it securely.
              </p>
            </div>
            <button onClick={() => setNewKey(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--ink-soft)" }}>✕</button>
          </div>
          <div style={{
            marginTop: "14px", display: "flex", gap: "10px", alignItems: "center"
          }}>
            <code style={{
              flex: 1, padding: "12px 14px", borderRadius: "12px",
              background: "rgba(0,0,0,0.04)", border: "1px solid var(--line)",
              fontFamily: "var(--font-mono), monospace", fontSize: "0.82rem",
              wordBreak: "break-all"
            }}>
              {newKey.rawKey}
            </code>
            <button
              onClick={handleCopy}
              className="primary-action"
              style={{ padding: "10px 18px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create Key */}
      <div className="surface" style={{ padding: "20px", borderRadius: "20px", marginBottom: "24px" }}>
        <span className="section-title">Create New Key</span>
        <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "end" }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Production, CI/CD Pipeline"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "14px",
                border: "1px solid var(--line)", background: "var(--panel-strong)",
                color: "var(--ink)", fontSize: "0.88rem"
              }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="primary-action"
            style={{ padding: "10px 20px", fontSize: "0.85rem" }}
          >
            {creating ? "Creating…" : "Generate Key"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: "10px", fontSize: "0.78rem" }}>
          {activeKeys.length}/5 active keys used
        </p>
      </div>

      {/* Usage Example */}
      <div className="surface" style={{ padding: "20px", borderRadius: "20px", marginBottom: "24px" }}>
        <span className="section-title">Quick Start</span>
        <pre style={{
          marginTop: "14px", padding: "16px", borderRadius: "14px",
          background: "rgba(0,0,0,0.04)", border: "1px solid var(--line)",
          overflow: "auto", fontSize: "0.78rem", lineHeight: 1.6,
          fontFamily: "var(--font-mono), monospace"
        }}>
{`curl -X POST https://your-domain.com/api/v1/run \\
  -H "Authorization: Bearer gt_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"task": "Analyze this codebase for security issues"}'`}
        </pre>
      </div>

      {/* Keys List */}
      <div className="surface" style={{ padding: "20px", borderRadius: "20px" }}>
        <span className="section-title">Your Keys</span>
        <div style={{ marginTop: "10px" }}>
          {loading && <p className="muted">Loading…</p>}
          {!loading && keys.length === 0 && (
            <div className="empty-state" style={{ marginTop: "10px" }}>
              <p className="muted" style={{ textAlign: "center" }}>No API keys created yet.</p>
            </div>
          )}
          {keys.map(k => (
            <KeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
          ))}
        </div>
      </div>
    </div>
  );
}
