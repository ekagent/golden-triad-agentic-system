"use client";

import { useState, useEffect } from "react";

function TierBadge({ tier }) {
  const colors = {
    free: { bg: "rgba(22,22,18,0.06)", color: "var(--ink-soft)", border: "var(--line)" },
    starter: { bg: "rgba(15,111,79,0.08)", color: "var(--accent)", border: "rgba(15,111,79,0.2)" },
    pro: { bg: "rgba(143,91,0,0.08)", color: "var(--warn)", border: "rgba(143,91,0,0.2)" },
    enterprise: { bg: "rgba(99,60,180,0.08)", color: "#6b3fb6", border: "rgba(99,60,180,0.2)" }
  };
  const c = colors[tier] || colors.free;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem",
      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`
    }}>{tier}</span>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editCredits, setEditCredits] = useState("");
  const [editTier, setEditTier] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin?view=users&limit=100")
      .then(r => {
        if (r.status === 403) throw new Error("Access denied");
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editUser,
          credits: parseInt(editCredits, 10),
          tier: editTier || undefined
        })
      });
      if (!res.ok) throw new Error("Save failed");
      setFlash(`Updated ${editUser.slice(0, 12)}…`);
      setEditUser(null);
      fetchUsers();
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      setFlash(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="error-box">{error}</div>;

  return (
    <div>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">◉ User Management</div>
          <h1 style={{ margin: "12px 0 0", fontSize: "1.4rem" }}>Platform Users</h1>
          <p className="muted" style={{ marginTop: "4px" }}>{data.total} registered users</p>
        </div>
        <button onClick={fetchUsers} disabled={loading} className="primary-action" style={{ padding: "10px 18px", fontSize: "0.85rem" }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </header>

      {flash && (
        <div style={{ padding: "10px 16px", borderRadius: "12px", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.85rem", marginBottom: "16px", animation: "fade-up 300ms ease" }}>
          {flash}
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="surface" style={{ padding: "22px", borderRadius: "20px", marginBottom: "20px", border: "2px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Edit User</h3>
            <button onClick={() => setEditUser(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--ink-soft)" }}>✕</button>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono), monospace", marginBottom: "16px" }}>{editUser}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
            <div className="field">
              <label className="label">Credits</label>
              <input
                type="number" value={editCredits} onChange={e => setEditCredits(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "14px", border: "1px solid var(--line)", background: "var(--panel-strong)", color: "var(--ink)", fontSize: "0.9rem" }}
              />
            </div>
            <div className="field">
              <label className="label">Tier</label>
              <select value={editTier} onChange={e => setEditTier(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: "14px" }}>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <button onClick={handleSave} disabled={saving} className="primary-action" style={{ padding: "10px 20px", fontSize: "0.85rem" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="surface" style={{ borderRadius: "22px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "14px 18px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>User ID</th>
              <th style={{ textAlign: "right", padding: "14px 18px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Credits</th>
              <th style={{ textAlign: "center", padding: "14px 18px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Tier</th>
              <th style={{ textAlign: "right", padding: "14px 18px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Last Active</th>
              <th style={{ textAlign: "center", padding: "14px 18px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.users.length === 0 && (
              <tr><td colSpan="5" style={{ padding: "28px", textAlign: "center", color: "var(--ink-soft)" }}>No users registered yet.</td></tr>
            )}
            {data.users.map((u) => (
              <tr key={u.userId} style={{ borderBottom: "1px solid rgba(22,22,18,0.05)", transition: "background 150ms ease" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(15,111,79,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 18px", fontFamily: "var(--font-mono), monospace", fontSize: "0.78rem" }}>
                  {u.userId.slice(0, 20)}…
                </td>
                <td style={{ padding: "12px 18px", textAlign: "right", fontWeight: 600 }}>
                  {u.credits}
                </td>
                <td style={{ padding: "12px 18px", textAlign: "center" }}>
                  <TierBadge tier={u.tier} />
                </td>
                <td style={{ padding: "12px 18px", textAlign: "right", fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  {new Date(u.updatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 18px", textAlign: "center" }}>
                  <button
                    onClick={() => { setEditUser(u.userId); setEditCredits(String(u.credits)); setEditTier(u.tier); }}
                    style={{ background: "none", border: "1px solid var(--line)", borderRadius: "10px", padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", color: "var(--ink)", transition: "border-color 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
