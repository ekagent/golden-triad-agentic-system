import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { getHealthSnapshot } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await getHealthSnapshot();

  return (
    <main className="studio" style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column", minHeight: "100vh", padding: "2rem" }}>
      <div className="brand-block" style={{ textAlign: "center", maxWidth: "600px", marginBottom: "2rem" }}>
        <span className="eyebrow">Golden Triad</span>
        <h1 className="brand-title">Welcome to the Agentic Cloud</h1>
        <p className="brand-copy" style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
          The world's first Golden Rule agentic system with direct lanes and a controlled fallback.
        </p>
      </div>

      <div className="surface" style={{ padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <SignedIn>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "h-12 w-12" } }} />
              <strong>Welcome back!</strong>
            </div>
            <Link href="/dashboard" className="primary-action" style={{ display: "block", textDecoration: "none", width: "100%" }}>
              Enter System Dashboard
            </Link>
          </div>
        </SignedIn>

        <SignedOut>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p className="muted">Please sign in to access the agent workspace.</p>
            <SignInButton mode="modal">
              <button className="primary-action">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="history-button" style={{ textAlign: "center", width: "100%" }}>Create Account</button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>

      <div style={{ marginTop: "3rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
        System Status: <span className={health?.providers?.openrouter?.configured ? "live provider-dot" : "warn provider-dot"} style={{ display: "inline-block", marginRight: "4px" }}></span>
        {health?.providers?.openrouter?.configured ? "Operational" : "Degraded"}
      </div>
    </main>
  );
}
