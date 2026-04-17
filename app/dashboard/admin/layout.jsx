"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Overview", icon: "◈" },
  { href: "/dashboard/admin/users", label: "Users", icon: "◉" },
  { href: "/dashboard/admin/runs", label: "Runs", icon: "▸" },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="surface" style={{
        width: "240px",
        minHeight: "100vh",
        borderRadius: "0",
        borderRight: "1px solid var(--line)",
        borderTop: "none",
        borderBottom: "none",
        borderLeft: "none",
        padding: "28px 0",
        position: "sticky",
        top: 0,
        flexShrink: 0
      }}>
        <div style={{ padding: "0 20px", marginBottom: "28px" }}>
          <Link href="/dashboard" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            ← Back to Studio
          </Link>
          <h2 style={{ margin: "12px 0 0", fontSize: "1.1rem", letterSpacing: "-0.02em" }}>Admin Console</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--ink-soft)" }}>Platform Management</p>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 20px",
                  fontSize: "0.88rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent)" : "var(--ink)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  textDecoration: "none",
                  transition: "all 150ms ease"
                }}
              >
                <span style={{ fontSize: "1rem", opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "20px", borderTop: "1px solid var(--line)", marginInline: "0", position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontFamily: "var(--font-mono), monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Golden Triad Admin
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: "28px 36px", maxWidth: "1100px" }}>
        {children}
      </main>
    </div>
  );
}
