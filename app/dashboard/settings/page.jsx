"use client";

import { useState, useEffect } from "react";

const AVAILABLE_MODELS = {
  architect: ["glm-4.7-flash", "glm-4-flash", "glm-4-air", "deepseek/deepseek-chat-v3.1", "google/gemini-2.5-flash"],
  builder: ["glm-4.7", "glm-4.5", "qwen/qwen3-coder", "gpt-4o", "claude-3-5-sonnet", "deepseek/deepseek-chat-v3.1"],
  reviewer: ["mimo-pro", "glm-4.5-air", "deepseek/deepseek-chat-v3.1", "gpt-4o-mini"]
};

const PROVIDERS = [
  { id: "glm", label: "GLM (Zhipu AI)", placeholder: "GLM_API_KEY" },
  { id: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-..." },
  { id: "memo", label: "MiMo / Memo", placeholder: "mimo-..." },
  { id: "minimax", label: "MiniMax", placeholder: "ey..." }
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({ api_keys: {}, role_models: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setSettings({
          api_keys: data.api_keys || {},
          role_models: data.role_models || {}
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Platform Settings</h1>
        <p className="muted" style={{ marginTop: "6px" }}>
          Configure your own API keys and specify which models act as specific agents in your system.
        </p>
      </header>

      {error && <div className="error-box" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && (
        <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.1)", color: "#16a34a", borderRadius: "10px", marginBottom: "16px", border: "1px solid rgba(34,197,94,0.2)" }}>
          Settings successfully saved!
        </div>
      )}

      {/* Role Models */}
      <div className="surface" style={{ padding: "20px", borderRadius: "20px", marginBottom: "24px" }}>
        <span className="section-title">Agent LLM Roles</span>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
          Explicitly choose which model is used for each phase, bypassing dynamic system ranking. Leave blank to automate.
        </p>

        {Object.entries({
          architect: { label: "Architect (Planning)", hint: "Needs fast reasoning and logic." },
          builder: { label: "Builder (Execution)", hint: "Needs heavy coding or generation power." },
          reviewer: { label: "Reviewer (QA)", hint: "Needs critique logic and different angle." }
        }).map(([role, meta]) => (
          <div key={role} style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              {meta.label}
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                list={`models-${role}`}
                placeholder="Auto (Dynamic)"
                value={settings.role_models[role] || ""}
                onChange={(e) => setSettings({ ...settings, role_models: { ...settings.role_models, [role]: e.target.value } })}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  border: "1px solid var(--line)", background: "var(--panel-strong)",
                  color: "var(--ink)", fontSize: "0.9rem"
                }}
              />
              <datalist id={`models-${role}`}>
                {AVAILABLE_MODELS[role].map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <p className="muted" style={{ fontSize: "0.75rem", margin: "4px 0 0" }}>{meta.hint}</p>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <div className="surface" style={{ padding: "20px", borderRadius: "20px", marginBottom: "24px" }}>
        <span className="section-title">Your API Keys (BYOK)</span>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
          Bring your own LLM API keys to pay only 1 compute credit per run (System fee). If left blank, the platform's API keys will be used costing 5 credits per run (Compute + System).
        </p>

        {PROVIDERS.map((provider) => (
          <div key={provider.id} style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              {provider.label} Key
            </label>
            <input
              type="password"
              placeholder={provider.placeholder}
              value={settings.api_keys[provider.id] || ""}
              onChange={(e) => setSettings({ ...settings, api_keys: { ...settings.api_keys, [provider.id]: e.target.value } })}
              style={{
                width: "100%", padding: "10px", borderRadius: "10px",
                border: "1px solid var(--line)", background: "var(--panel-strong)",
                color: "var(--ink)", fontSize: "0.9rem"
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="primary-action"
        style={{ width: "100%", padding: "14px", fontSize: "1rem", borderRadius: "12px", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
