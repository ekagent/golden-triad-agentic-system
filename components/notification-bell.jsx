"use client";

import { useState, useEffect, useRef } from "react";

const TYPE_ICONS = {
  low_credits_5: "🔴",
  low_credits_20: "🟡",
  low_credits_50: "🟠",
  subscription_renewal: "🔄",
  system: "📢",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setUnread(d.unread || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAction = async (action, notificationId = null) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notificationId })
    });
    fetchNotifications();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "none", border: "1px solid var(--line)",
          borderRadius: "12px", padding: "7px 10px",
          cursor: "pointer", fontSize: "1rem",
          transition: "all 150ms", color: "var(--ink)"
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            width: 18, height: 18, borderRadius: "50%",
            background: "var(--danger)", color: "#fff",
            fontSize: "0.65rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fade-up 300ms ease"
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="surface" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "340px", maxHeight: "400px", overflow: "auto",
          borderRadius: "18px", padding: "0",
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          zIndex: 100, animation: "fade-up 200ms ease"
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--line)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => handleAction("read_all")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          {notifications.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ink-soft)", fontSize: "0.85rem" }}>
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(22,22,18,0.05)",
                  background: n.read ? "transparent" : "rgba(15,111,79,0.03)",
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  cursor: "pointer", transition: "background 150ms"
                }}
                onClick={() => {
                  if (!n.read) handleAction("read", n.id);
                  if (n.actionUrl) window.location.href = n.actionUrl;
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(15,111,79,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(15,111,79,0.03)"}
              >
                <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "2px" }}>
                  {TYPE_ICONS[n.type] || "📌"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 400 : 600, fontSize: "0.82rem" }}>{n.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "2px" }}>{n.message}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--ink-soft)", marginTop: "4px", fontFamily: "var(--font-mono), monospace" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleAction("dismiss", n.id); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.85rem", color: "var(--ink-soft)", opacity: 0.5,
                    flexShrink: 0
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
