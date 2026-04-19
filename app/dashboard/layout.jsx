"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import NotificationBell from "@/components/notification-bell";
import SuperAdminBadge from "@/components/SuperAdminBadge";


const NAV_LINKS = [
  { href: "/dashboard", label: "Studio" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/keys", label: "API Keys" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  // Admin sub-layout handles its own chrome
  if (pathname.startsWith("/dashboard/admin")) return children;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <header className="surface" style={{
        position: "sticky", top: 0, zIndex: 50,
        borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none",
        borderBottom: "1px solid var(--line)",
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "56px"
      }}>
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", color: "var(--ink)", letterSpacing: "-0.02em" }}>
            ◈ Golden Triad
          </Link>
          <nav style={{ display: "flex", gap: "4px" }}>
            {NAV_LINKS.map(link => {
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} style={{
                  padding: "6px 14px", borderRadius: "999px",
                  fontSize: "0.82rem", fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent)" : "var(--ink-soft)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  textDecoration: "none", transition: "all 150ms"
                }}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Tools + Notification Bell + User */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <SuperAdminBadge />
          <NotificationBell />
          <UserButton afterSignOutUrl="/" />
        </div>

      </header>

      {/* Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
